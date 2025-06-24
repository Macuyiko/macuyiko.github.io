Title: Solving LinkedIn Queens With CP-SAT
Author: Seppe "Macuyiko" vanden Broucke
Date: 2025-06-24 10:45

On LinkedIn, you can [play](https://www.linkedin.com/games/queens) a variant of the N-Queens problem.
A community version of the puzzle can be found [here](https://queensgame.vercel.app/).

Recently, we saw it solved using:

- [SAT solvers](https://ryanberger.me/posts/queens/)
- [SMT Solvers](https://buttondown.com/hillelwayne/archive/solving-linkedin-queens-with-smt/)
- [APL](https://pitr.ca/2025-06-14-queens)
- [MiniZinc](https://zayenz.se/blog/post/linkedin-queens/)
- [Haskell](https://imiron.io/post/linkedin-queens/)

I wanted to solve it using the [CP-SAT constraint programming solver](https://developers.google.com/optimization/cp/cp_solver), which is part of Google's OR Tools.

Installing this in a Python equivalent is easy: `uv add ortools requests`.

Next, we set up some basic information and fetch a level:

```python
from ortools.sat.python import cp_model
import requests
import re
import ast


level_source = requests.get(
    "https://raw.githubusercontent.com/samimsu/queens-game-linkedin/"
    + "refs/heads/main/src/utils/levels/level1.ts"
).text
match = re.search(
    r"colorRegions:\s*(\[[^\]]+\](?:,\s*\[[^\]]+\])*)", level_source, re.DOTALL
)

LEVEL = ast.literal_eval(f"{match.group(1)}]")
ZONES = set([letter for row in LEVEL for letter in row])
ROWS = len(LEVEL)
COLS = len(LEVEL[0])
```

I'm just grabbing the level file from the aforementioned community version of the puzzle.
The [other levels are in the GitHub repo](https://github.com/samimsu/queens-game-linkedin/tree/main/src/utils/levels).

Next, we set up the model and create boolean variables indicating whether a position has a queen or not:

```python
model = cp_model.CpModel()
solution = [
    [model.NewBoolVar(f"queen_{r}_{c}") for c in range(COLS)] for r in range(ROWS)
]
```

Next, we add the basic constraints: only one queen per row, column, and colored region:

```python
# Exactly one per row
for r in range(ROWS):
    model.Add(sum(solution[r][c] for c in range(COLS)) == 1)

# Exactly one per column
for c in range(COLS):
    model.Add(sum(solution[r][c] for r in range(ROWS)) == 1)

# Exactly one per region
for letter in ZONES:
    model.Add(
        sum(
            solution[r][c]
            for r in range(ROWS)
            for c in range(COLS)
            if LEVEL[r][c] == letter
        )
        == 1
    )
```

Finally, queens cannot touch each other, including on the diagonals.
Since the previous constraints already cover horizontal and vertical touching, we only need to prohibit a queen to be present diagonally in the row below a given queen.
We don't need to prohibit the row above as this is symmetric.

```python
# No queens on the same diagonal
for r in range(ROWS - 1):
    for c in range(COLS):
        if c > 0:
            model.Add(solution[r + 1][c - 1] == 0).OnlyEnforceIf(solution[r][c])
        if c < COLS - 1:
            model.Add(solution[r + 1][c + 1] == 0).OnlyEnforceIf(solution[r][c])
```

And finally we can solve and print out a solution:

```python
def pr_sol(sol, solution):
    for r in range(ROWS):
        for c in range(COLS):
            if sol.Value(solution[r][c]) > 0:
                print(f" *{LEVEL[r][c]}* ", end="")
            else:
                print(f"  {LEVEL[r][c].lower()}  ", end="")
        print("")
    print("\n\n")

solver = cp_model.CpSolver()
solver.parameters.log_search_progress = True
result = solver.Solve(model)
pr_sol(solver, solution)
```

Success:

```plain
CpSolverResponse summary:
status: OPTIMAL
walltime: 0.003608
usertime: 0.003608
deterministic_time: 4.7637e-05
gap_integral: 0

  a    a    b   *B*   b    c    c    c  
  a    d    b    d    b   *E*   c    c  
  a   *D*   b    d    b    c    c    c  
  a    d    d    d    b    f    g   *C* 
 *A*   d    d    d    b    f    g    g  
  a    d   *H*   d    b    f    g    g  
  h    d    h    d    b    f   *F*   g  
  h    h    h    h   *G*   g    g    g
```

We can also easily confirm whether this is the **only** feasible solution:

```python
class VarArraySolutionPrinter(cp_model.CpSolverSolutionCallback):
    def __init__(self, variables):
        cp_model.CpSolverSolutionCallback.__init__(self)
        self.__variables = variables
    def on_solution_callback(self) -> None:
        pr_sol(self, self.__variables)

solver = cp_model.CpSolver()
solver.parameters.log_search_progress = True
solver.parameters.enumerate_all_solutions = True
result = solver.Solve(model, VarArraySolutionPrinter(solution))
```

Which indeed is the case:

```plain
Starting subsolver 'main' hint search at 0.01s
Starting subsolver 'main' search at 0.01s
#1       0.01s main
  a    a    b   *B*   b    c    c    c  
  a    d    b    d    b   *E*   c    c  
  a   *D*   b    d    b    c    c    c  
  a    d    d    d    b    f    g   *C* 
 *A*   d    d    d    b    f    g    g  
  a    d   *H*   d    b    f    g    g  
  h    d    h    d    b    f   *F*   g  
  h    h    h    h   *G*   g    g    g  

#Done    0.01s main
```
