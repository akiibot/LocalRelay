"""Display the frozen held-out evaluation. Retraining is explicit via train.py."""
import json
from pathlib import Path
print(json.dumps(json.loads(Path('ml/evaluation.json').read_text()),indent=2))
