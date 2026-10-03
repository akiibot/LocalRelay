"""Verify the binary created by train.py. Export occurs only during training."""
import hashlib,json
from pathlib import Path
p=Path('public/models/v1');m=json.loads((p/'metadata.json').read_text());b=(p/'weights.bin').read_bytes()
assert len(b)==m['byteLength'] and hashlib.sha256(b).hexdigest()==m['sha256']
print('Verified exported float32 package:',m['version'],len(b),'bytes')
