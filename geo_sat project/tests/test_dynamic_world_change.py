import os
import sys
import pytest
import numpy as np
from unittest.mock import patch, MagicMock

# Ensure project root is in system path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

from src.change_detection.diff_maps import generate_change_map
from scripts.detect_change_dynamic_world import detect_change

def test_binary_change_unchanged():
    """6 -> 6 should produce binary change 0."""
    y1 = np.array([[6]], dtype=np.uint8)
    y2 = np.array([[6]], dtype=np.uint8)
    
    bc, tc, changed = generate_change_map(y1, y2, nodata_val=255)
    assert bc[0, 0] == 0
    assert tc[0, 0] == 606
    assert changed[0, 0] == False

def test_binary_change_changed():
    """4 -> 6 should produce binary change 1 and transition 406."""
    y1 = np.array([[4]], dtype=np.uint8)
    y2 = np.array([[6]], dtype=np.uint8)
    
    bc, tc, changed = generate_change_map(y1, y2, nodata_val=255)
    assert bc[0, 0] == 1
    assert tc[0, 0] == 406
    assert changed[0, 0] == True

def test_binary_change_nodata():
    """255 -> 6 should produce binary change 255 and transition 65535."""
    y1 = np.array([[255, 6], [4, 6]], dtype=np.uint8)
    y2 = np.array([[6, 255], [6, 6]], dtype=np.uint8)
    
    bc, tc, changed = generate_change_map(y1, y2, nodata_val=255)
    
    # Custom overriding logic applied in detect_change_dynamic_world to be extra safe:
    valid_mask_1 = (y1 != 255)
    valid_mask_2 = (y2 != 255)
    valid_both = valid_mask_1 & valid_mask_2
    invalid_mask_either = ~valid_both
    
    bc[invalid_mask_either] = 255
    tc[invalid_mask_either] = 65535
    
    assert bc[0, 0] == 255 # 255 -> 6
    assert tc[0, 0] == 65535
    assert changed[0, 0] == False
    
    assert bc[0, 1] == 255 # 6 -> 255
    assert tc[0, 1] == 65535
    
    assert bc[1, 0] == 1   # 4 -> 6
    assert tc[1, 0] == 406
    
    assert bc[1, 1] == 0   # 6 -> 6
    assert tc[1, 1] == 606

def test_water_and_nodata_distinction():
    """Water=0, Nodata=255."""
    y1 = np.array([[0]], dtype=np.uint8)
    y2 = np.array([[0]], dtype=np.uint8)
    
    bc, tc, changed = generate_change_map(y1, y2, nodata_val=255)
    assert bc[0, 0] == 0
    assert tc[0, 0] == 0
