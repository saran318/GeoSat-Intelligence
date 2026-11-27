import importlib
import os
import sys
import numpy as np
import pytest

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)


def test_utils_and_app_import_without_torch(monkeypatch):
    """Ensure utils and FastAPI app import cleanly when PyTorch is unavailable."""
    monkeypatch.setitem(sys.modules, "torch", None)
    monkeypatch.setitem(sys.modules, "torch.nn", None)
    monkeypatch.setitem(sys.modules, "torch.nn.functional", None)

    import utils
    importlib.reload(utils)
    assert utils.torch is None
    assert utils.F is None

    import app.main as app_main
    importlib.reload(app_main)
    assert app_main.app is not None

    with pytest.raises(RuntimeError, match="PyTorch is required"):
        utils.process_bands_array(np.zeros((8, 8, 4), dtype=np.float32))
