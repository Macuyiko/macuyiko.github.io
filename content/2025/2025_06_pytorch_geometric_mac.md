Title: Installing PyTorch and PyTorch Geometric on Mac M* With uv And Without Homebrew.
Author: Seppe "Macuyiko" vanden Broucke
Date: 2025-06-18 11:40

A [huge](https://github.com/pyg-team/pytorch_geometric/issues/10178) mess at the moment. Binary wheels point to the wrong location ("Library" Python install).
I don't want to use Homebrew on this Mac so resorted to compile from source.

First set up a project directory:

```bash
mkdir pygtest 
cd pygtest
```

Init with a Python version and Torch version:

```bash
uv init --python 3.12
uv add torch==2.7.0 torchvision torchaudio
```

Then make sure Command Line Tools are installed:

```bash
xcode-select --install
```

Set up build tools:

```bash
uv pip install cmake ninja
```

Export compile variables:

```bash
export CC=clang
export CXX=clang++
export CFLAGS="-Xclang -fopenmp -I/usr/local/include"
export CXXFLAGS="$CFLAGS"
export LDFLAGS="-L/usr/local/lib -lomp"
export CMAKE_OSX_ARCHITECTURES=$(uname -m)
export MACOSX_DEPLOYMENT_TARGET=$(sw_vers -productVersion | cut -d. -f1-2)
```

Compile the easy packages that have source wheels:

```bash
for pkg in torch_scatter torch_sparse torch_cluster torch_spline_conv
do uv pip install --no-build-isolation --no-binary $pkg $pkg; done
```

Download and extract the right `openmp` binary (will be placed in `/usr/local/include`):

```bash
curl -O https://mac.r-project.org/openmp/openmp-19.1.0-darwin20-Release.tar.gz 
sudo tar fvxz openmp-19.1.0-darwin20-Release.tar.gz -C / 
```

Compile `pyg-lib`;

```bash
export PYG_TAG=0.4.0
uv pip install --no-binary :all: --no-build-isolation "git+https://github.com/pyg-team/pyg-lib.git@$PYG_TAG"
```

Add `torch_geometric`:

```bash
uv add torch_geometric
```

And test:

```bash
uv run python - <<'PY'                                    
import torch, torch_geometric, pyg_lib, torch_scatter
print("Torch           :", torch.__version__)
print("PyG             :", torch_geometric.__version__)
print("pyg_lib         :", pyg_lib.__version__)
print("torch_scatter   :", torch_scatter.__version__)
print("MPS available   :", torch.backends.mps.is_available())
PY
```

```plain
Torch           : 2.7.0
PyG             : 2.6.1
pyg_lib         : 0.4.0
torch_scatter   : 2.1.2
MPS available   : True
```
