"""Group-isolated training, development-only tuning, frozen test evaluation and float32 export."""
import json,hashlib,platform
from pathlib import Path
import numpy as np
import scipy
from scipy.sparse import csr_matrix
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score,classification_report,confusion_matrix,precision_recall_fscore_support
INTENTS=['booking_request','availability_query','price_query','change_cancel','directions_transport','other_tourism','unsupported']
REQS=['vegetarian','transport','accessibility','allergy_or_medical','payment_condition','other_extra_detail']
records=json.loads(Path('ml/generated/features.json').read_text())
if any(r['source']!='synthetic' for r in records):raise ValueError('This seed pipeline requires explicit source-stratified evaluation before accepting human/real datasets.')
# Connected components ensure sharing either author OR paraphrase family keeps records together.
parent=list(range(len(records)))
def find(i):
 while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
 return i
def union(a,b):parent[find(b)]=find(a)
seen={}
for i,r in enumerate(records):
 for kind in ('authorGroup','paraphraseFamily'):
  key=(kind,r[kind])
  if key in seen:union(i,seen[key])
  seen[key]=i
components={}
for i,r in enumerate(records):components.setdefault(find(i),[]).append(i)
rng=np.random.default_rng(17);split={'train':[],'dev':[],'test':[]}
for label in INTENTS:
 groups=[g for g in components.values() if records[g[0]]['intent']==label]
 rng.shuffle(groups)
 if len(groups)<5:raise ValueError(f'Insufficient groups for {label}')
 for k,g in enumerate(groups):split['train' if k<len(groups)-4 else 'dev' if k<len(groups)-2 else 'test'].extend(g)
for a,b in [('train','dev'),('train','test'),('dev','test')]:
 for key in ('authorGroup','paraphraseFamily'):
  assert not {records[i][key] for i in split[a]} & {records[i][key] for i in split[b]}
indptr=[0];indices=[];values=[]
for r in records:indices+=r['indices'];values+=r['values'];indptr.append(len(indices))
X=csr_matrix((values,indices,indptr),shape=(len(records),8192),dtype=np.float64)
y=np.array([INTENTS.index(r['intent']) for r in records]);Y=np.array([[int(k in r['requirements']) for k in REQS] for r in records])
tr,dv,te=[split[k] for k in ('train','dev','test')]
best=None
for c in (.1,1,10,100):
 m=LogisticRegression(C=c,max_iter=1500,solver='lbfgs',random_state=17).fit(X[tr],y[tr]);score=f1_score(y[dv],m.predict(X[dv]),average='macro')
 if best is None or score>best[0]:best=(score,c,m)
_,c,intent=best
heads=[];thresholds=[];chosen=[]
for k in range(6):
 best=None
 for reg in (.1,1,10,100):
  m=LogisticRegression(C=reg,max_iter=1500,random_state=17,class_weight='balanced').fit(X[tr],Y[tr,k]);scores=m.predict_proba(X[dv])[:,1]
  for t in (.25,.35,.45,.5,.6,.7):
   f=f1_score(Y[dv,k],scores>=t,zero_division=0)
   if best is None or f>best[0]:best=(f,reg,t,m)
 _,reg,t,m=best;heads.append(m);thresholds.append(t);chosen.append(reg)
# Choose the lowest score/margin meeting .95 routing precision on development (not calibrated).
probs=intent.predict_proba(X[dv]);order=np.sort(probs,axis=1);candidate=[]
for min_score in (.25,.35,.45,.55,.65,.75,.85):
 for margin in (.05,.1,.15,.25):
  accepted=(order[:,-1]>=min_score)&((order[:,-1]-order[:,-2])>=margin)
  if accepted.sum() and (probs.argmax(axis=1)[accepted]==y[dv][accepted]).mean()>=.95:candidate.append((int(accepted.sum()),-min_score,-margin,min_score,margin))
_,_,_,intent_min,margin_min=max(candidate) if candidate else (0,0,0,.9,.3)
W=np.concatenate([intent.coef_,np.concatenate([m.coef_ for m in heads])]).astype('<f4');B=np.concatenate([intent.intercept_,np.concatenate([m.intercept_ for m in heads])]).astype('<f4')
blob=W.tobytes()+B.tobytes();out=Path('public/models/v1');out.mkdir(parents=True,exist_ok=True)
(out/'weights.bin').write_bytes(blob)
dataset_hash=hashlib.sha256(Path('ml/data/seed.jsonl').read_bytes()).hexdigest()
metadata=dict(version='seed-v1-'+hashlib.sha256(blob).hexdigest()[:12],featureVersion='fnv1a-8192-v1',features=8192,rows=13,byteLength=len(blob),weightsOffset=0,biasesOffset=8192*13*4,sha256=hashlib.sha256(blob).hexdigest(),intentLabels=INTENTS,requirementLabels=REQS,thresholds=thresholds,intentMin=intent_min,marginMin=margin_min,provenance='Developer-authored synthetic seed only; no native, operator or blind human data',datasetSha256=dataset_hash,regularization=dict(intent=c,requirements=chosen),trainingVersions=dict(python=platform.python_version(),numpy=np.__version__,scipy=scipy.__version__,sklearn=sklearn.__version__))
(out/'metadata.json').write_text(json.dumps(metadata,indent=2))
pred=intent.predict(X[te]);headpred=np.stack([m.predict_proba(X[te])[:,1]>=t for m,t in zip(heads,thresholds)],axis=1)
req_report={}
for k,name in enumerate(REQS):
 p,r,f,_=precision_recall_fscore_support(Y[te,k],headpred[:,k],average='binary',zero_division=0);req_report[name]=dict(precision=float(p),recall=float(r),f1=float(f),positive_count=int(Y[te,k].sum()),n=len(te))
def keywords(text):
 t=text.lower()
 for label,keys in [('change_cancel',['cancel','reschedul','change','amend','undo']),('directions_transport',['taxi','bus','train','transport','pickup','pick us up','directions','route map']),('price_query',['price','cost','fee','quote','charge','taka','rate']),('availability_query',['available','space','room','slots','seats','full','open']),('booking_request',['book','reserv','register','sign up','schedule','attend','join']),('other_tourism',['museum','village','tourist','weather','hotel','souvenir','crafts'])]:
  if any(k in t for k in keys):return INTENTS.index(label)
 return 6
keypred=[keywords(records[i]['text']) for i in te]
report=dict(provenance='SYNTHETIC ONLY; grouped families are not independent human authors',datasetSha256=dataset_hash,counts={k:len(v) for k,v in split.items()},groups={k:len({records[i]['paraphraseFamily'] for i in v}) for k,v in split.items()},splitOverlap=False,intentMacroF1=float(f1_score(y[te],pred,average='macro')),intent=classification_report(y[te],pred,labels=list(range(7)),target_names=INTENTS,output_dict=True,zero_division=0),confusionMatrix=confusion_matrix(y[te],pred,labels=list(range(7))).tolist(),requirements=req_report,keywordIntentMacroF1=float(f1_score(y[te],keypred,average='macro')),modelBytes=len(blob),human_metrics=None,lowEndPhoneP95=None)
Path('ml/evaluation.json').write_text(json.dumps(report,indent=2));Path('ml/splits.json').write_text(json.dumps({k:[records[i]['id'] for i in v] for k,v in split.items()},indent=2))
# Float32 export reference evaluated in Python using the exact exported coefficients.
fixtures=[]
for i in te[:30]:
 logits=np.asarray(X[i]@W.T).ravel()+B;p=np.exp(logits[:7]-max(logits[:7]));p=p/p.sum();scores=np.concatenate([p,1/(1+np.exp(-logits[7:]))]);fixtures.append(dict(text=records[i]['text'],scores=scores.tolist()))
Path('tests/fixtures/parity.json').write_text(json.dumps(fixtures,indent=2))
print(json.dumps({k:report[k] for k in ['counts','intentMacroF1','keywordIntentMacroF1','modelBytes']},indent=2))
