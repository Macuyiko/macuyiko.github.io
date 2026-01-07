Title: Solving Enclose.Horse With CP-SAT
Author: Seppe "Macuyiko" vanden Broucke
Date: 2026-01-07 18:54

Yesterday (6 Jan), someone showed up a [small clever puzzle game on Hacker News, called enclose.horse](https://news.ycombinator.com/item?id=46509211).

An example puzzle looks like this:

![](/images/2026/horse1.png)

The game is played on a grid of grass or water tiles. The goal is to place walls so that the horse cannot escape (i.e. exit the map) whilst keeping the area of the enclosure as large as possible.

Walls can only be placed on grass tiles, and the horse cannot traverse over water either. The neighborhood is a von Neumann one. The score is calculated as the number of tiles in the enclosure (including the one the horse stands on). Interesting extra: tiles can also contain a cherry, on which no walls can be placed either but add an additional three points if they are within the enclosure.

Just as I've done in [the past](https://blog.macuyiko.com/post/2025/solving-linkedin-queens-with-cp-sat.html), I wanted to have a quick step towards finding the optimal solution using the [CP-SAT constraint programming solver](https://developers.google.com/optimization/cp/cp_solver), which is part of Google's OR Tools. My initial feeling was that the "flood fill" would be hard to tackle and/or the solve time would be large for this grid size, but CP-SAT has no trouble with it.

First, we perform some necessary imports, load in a level from a daily, and parse the map:

```python
from ortools.sat.python import cp_model
import requests


def parse_map(map_str: str):
    lines = [ln.rstrip("\n") for ln in map_str.splitlines() if ln.strip() != ""]
    if not lines:
        raise ValueError("Empty map string")

    N = len(lines[0])
    for k, ln in enumerate(lines):
        if len(ln) != N:
            raise ValueError(f"Ragged map: line {k} has len {len(ln)} != {N}")

    M = len(lines)
    grid_water = [[0] * N for _ in range(M)]
    is_cherry = [[0] * N for _ in range(M)]
    horse_pos = None

    for i, ln in enumerate(lines):
        for j, ch in enumerate(ln):
            if ch == "~":
                grid_water[i][j] = 1
            elif ch == "H":
                if horse_pos is not None:
                    raise ValueError("Multiple horses 'H' found")
                horse_pos = (i, j)
            elif ch == "C":
                is_cherry[i][j] = 1
            # '.' or anything else -> empty

    if horse_pos is None:
        raise ValueError("No horse 'H' found")

    return lines, grid_water, horse_pos, is_cherry


if __name__ == "__main__":
    url = "https://enclose.horse/api/daily/2026-01-07"
    data = requests.get(url).json()
    
    print("Parsing map...")
    lines, grid_water, horse_pos, is_cherry = parse_map(data["map"])

    print("Solving...")
    status, score, walls, region = solve(
        grid_water, horse_pos, is_cherry, data["budget"], time_limit_s=30
    )

    print("Status:", status)
    print("Score:", score)
    print("Walls:", len(walls))
    print(render_solution(lines, grid_water, is_cherry, horse_pos, walls, region))
```

Next, we can implement the `solve` function itself:

```python
def solve(grid_water, horse_pos, is_cherry, wall_budget, time_limit_s=10, log=False):
    M = len(grid_water)
    N = len(grid_water[0]) if M else 0
    hi, hj = horse_pos

    def in_bounds(i, j):
        return 0 <= i < M and 0 <= j < N

    def is_border(i, j):
        return i == 0 or j == 0 or i == M - 1 or j == N - 1

    if not in_bounds(hi, hj):
        raise ValueError("horse out of bounds")
    if grid_water[hi][hj] == 1:
        raise ValueError("horse cannot be on water")

    model = cp_model.CpModel()
    neighbors = [(1, 0), (-1, 0), (0, 1), (0, -1)]

    w, r, passable = {}, {}, {}

    for i in range(M):
        for j in range(N):
            water = (grid_water[i][j] == 1)
            cherry = (is_cherry[i][j] == 1)

            r[i, j] = model.NewBoolVar(f"r_{i}_{j}")

            if water:
                w[i, j] = model.NewConstant(0)
                passable[i, j] = model.NewConstant(0)
                model.Add(r[i, j] == 0)
                continue

            # No walls on horse/cherry
            if (i, j) == (hi, hj) or cherry:
                w[i, j] = model.NewConstant(0)
            else:
                w[i, j] = model.NewBoolVar(f"w_{i}_{j}")

            # For non-water: passable + wall = 1
            passable[i, j] = model.NewBoolVar(f"p_{i}_{j}")
            model.Add(passable[i, j] + w[i, j] == 1)

            # Reachable implies passable
            model.Add(r[i, j] <= passable[i, j])

    # Horse must be reachable
    model.Add(r[hi, hj] == 1)

    # Constrict hore: no reachable border
    for i in range(M):
        for j in range(N):
            if is_border(i, j):
                model.Add(r[i, j] == 0)

    # Wall budget
    model.Add(sum(w[i, j] for i in range(M) for j in range(N)) <= wall_budget)

    # r[u] ∧ passable[v] => r[v]
    for i in range(M):
        for j in range(N):
            for di, dj in neighbors:
                ni, nj = i + di, j + dj
                if in_bounds(ni, nj):
                    model.AddImplication(r[i, j], r[ni, nj]).OnlyEnforceIf(passable[ni, nj])

    # Objective: cherries add +3
    weights = {}
    for i in range(M):
        for j in range(N):
            if grid_water[i][j] == 1:
                weights[i, j] = 0
            else:
                weights[i, j] = 4 if is_cherry[i][j] == 1 else 1

    model.Maximize(
        sum(weights[i, j] * r[i, j] for i in range(M) for j in range(N))
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(time_limit_s)
    solver.parameters.log_search_progress = bool(log)
    solver.parameters.log_to_stdout = bool(log)

    status = solver.Solve(model)
    status_name = solver.StatusName(status)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return status_name, 0, set(), set()

    score = 0
    walls_set, reachable_set = set(), set()
    for i in range(M):
        for j in range(N):
            if solver.Value(r[i, j]) == 1:
                reachable_set.add((i, j))
                score += weights[i, j]
            if grid_water[i][j] == 0 and is_cherry[i][j] == 0 and (i, j) != (hi, hj) and solver.Value(w[i, j]) == 1:
                walls_set.add((i, j))

    return status_name, score, walls_set, reachable_set
```

This base setup is actually rather simple. Our main decision boolean just determines where we place walls. Two auxiliary variables keep track of which tiles are reachable/passable.

- The horse tile must be reachable
- A tile being reachable implies it is passable
- For each reachable tile and a passable neighbor, we imply that the neighbor is also reachable 

Finally, we can render out the solution:

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
def render_solution(lines, grid_water, is_cherry, horse_pos, walls_set, reachable_set):
    M = len(lines)
    N = len(lines[0]) if M else 0
    hi, hj = horse_pos

    out = []
    for i in range(M):
        row = []
        for j in range(N):
            if (i, j) == (hi, hj):
                row.append("🐎")
            elif grid_water[i][j] == 1:
                row.append("🟦")
            elif (i, j) in walls_set:
                row.append("🧱")
            elif is_cherry[i][j] == 1:
                row.append("🍒")
            else:
                row.append("🍃" if (i, j) in reachable_set else "⬜")
        out.append("".join(row))
    return "\n".join(out)
```

This seems to work well:

```plain
Status: OPTIMAL
Score: 66
Walls: 12
🟦🟦⬜🧱🟦🟦🟦🧱🟦🟦🟦🟦
🟦🍒🧱🍒🍃🍃🍃🍃🍃🍃🍃🟦
⬜⬜🍒🧱🍃🍃🍃🍃🍃🟦🍃🧱
⬜🍒⬜🍒🟦🟦🍃🍃🟦🟦🍃🟦
🟦⬜🟦⬜🟦🟦🍃🍃🍃🍃🍃🟦
🟦⬜⬜🧱🍃🍃🍃🍃🍃🍃🍃🟦
⬜⬜⬜⬜🟦🍃🟦🟦🍃🍃🍃🟦
🟦⬜⬜⬜🟦🟦🐎🟦🍃🍃🍃🧱
🟦⬜⬜⬜⬜🧱🍃🍃🍃🍃🍃🧱
🟦⬜⬜⬜⬜⬜🟦🟦🍃🍃🍃🟦
⬜⬜🟦🟦⬜⬜🟦🟦🍒🍃🍒🟦
🟦⬜🟦⬜⬜⬜⬜⬜🧱🍒🍃🟦
🟦⬜⬜⬜⬜⬜⬜⬜🍒🧱🍒🟦
🟦⬜🟦🟦⬜🟦⬜🟦⬜⬜🧱🟦
```

However, as a user [pointed out to me](https://news.ycombinator.com/item?id=46515350), this can end up being problematic for maps such as this one:

```plain
Score: 53
Walls: 6
🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦
🟦🍃🍃🍃🍃🍃🍃🍃🍃🍃🍃🟦
🟦🍃🍃🍃🍃🍃🍃🍃🍃🍃🍃🟦
🟦🍃🍃🍃🍃🍃🍃🍃🍃🍃🍃🟦
🟦🍃🍃🍃🍃🍃🍃🍃🍃🍃🍃🟦
🟦🍃🍃🍃🍃🍃🍃🍃🍃🍃🍃🟦
🟦🍃🟦🟦🟦🟦🟦🟦🟦🟦🍃🟦
⬜🧱⬜⬜⬜⬜⬜⬜⬜⬜🧱⬜
⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜
⬜⬜⬜⬜⬜🧱⬜⬜⬜⬜⬜⬜
⬜⬜⬜⬜🧱🐎🧱⬜⬜⬜⬜⬜
⬜⬜⬜⬜⬜🧱⬜⬜⬜⬜⬜⬜
```

The problem is that by closing of "horseless areas", the solver can freely assign these to be reachable as well, erroneously adding these to the objective.

Hence, we also need to add single flow commodity constraints, flowing from the horse:

```python
    # Prevent unconnected island by single commodity flow
    K = M * N
    flows = {}
    neighbors = [(1,0), (-1,0), (0,1), (0,-1)]

    # directed edge flows
    for i in range(M):
        for j in range(N):
            for di, dj in neighbors:
                ni, nj = i + di, j + dj
                if 0 <= ni < M and 0 <= nj < N:
                    f = model.NewIntVar(0, K, f"f_{i}_{j}_to_{ni}_{nj}")
                    flows[(i, j, ni, nj)] = f
                    # We can only send flow along reachable & passable cells
                    model.Add(f <= K * r[i, j])
                    model.Add(f <= K * r[ni, nj])

    total_reached = sum(r[i, j] for i in range(M) for j in range(N))

    for i in range(M):
        for j in range(N):
            inflow = []
            outflow = []
            for di, dj in neighbors:
                pi, pj = i - di, j - dj
                ni, nj = i + di, j + dj
                if 0 <= pi < M and 0 <= pj < N:
                    inflow.append(flows[(pi, pj, i, j)])
                if 0 <= ni < M and 0 <= nj < N:
                    outflow.append(flows[(i, j, ni, nj)])

            if (i, j) == (hi, hj):
                # Horse supplies exactly total_reached - 1
                model.Add(sum(outflow) - sum(inflow) == total_reached - 1)
            else:
                # Each reachable node consumes 1
                model.Add(sum(inflow) - sum(outflow) == r[i, j])
```

Solving again, we now get the true correct solution:

```plain
Score: 2
Walls: 6
🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦
🟦⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜🟦
🟦⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜🟦
🟦⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜🟦
🟦⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜🟦
🟦⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜🟦
🟦⬜🟦🟦🟦🟦🟦🟦🟦🟦⬜🟦
⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜
⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜
⬜⬜⬜⬜⬜🧱🧱⬜⬜⬜⬜⬜
⬜⬜⬜⬜🧱🐎🍃🧱⬜⬜⬜⬜
⬜⬜⬜⬜⬜🧱🧱⬜⬜⬜⬜⬜
```
