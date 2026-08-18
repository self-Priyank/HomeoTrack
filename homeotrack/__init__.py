import sys
from pathlib import Path

# Automatically ensure project root is on sys.path regardless of execution CWD
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

"""
HomeoTrack AI-First Homeopathic Clinical Decision Support System.
"""

__version__ = "0.1.0"
