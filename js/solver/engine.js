"use strict";

var EXPORT_CONFLICT_HEATMAP = false;

class SudokuSolver {
  constructor(handlers, shape) {
    this._shape = shape;
    this._internalSolver = new SudokuSolver.InternalSolver(handlers, shape);

    this._progressExtraStateFn = null;
    this._progressCallback = null;

    this._reset();
  }

  _reset() {
    this._internalSolver.reset();
    this._iter = null;
    this._timer = new Timer();
  }

  setProgressCallback(callback, logFrequency) {
    this._progressCallback = callback;
    this._internalSolver.setProgressCallback(
      this._sendProgress.bind(this),
      logFrequency);
  }

  _sendProgress() {
    let extraState = null;
    if (this._progressExtraStateFn) extraState = this._progressExtraStateFn();
    if (this._progressCallback) this._progressCallback(extraState);
  }

  countSolutions() {
    this._reset();

    // Add a sample solution to the state updates, but only if a different
    // solution is ready.
    let sampleSolution = null;
    this._progressExtraStateFn = () => {
      let result = null;
      if (sampleSolution) {
        result = { solution: sampleSolution };
        sampleSolution = null;
      }
      return result;
    };

    this._timer.runTimed(() => {
      for (const result of this._getIter()) {
        // Only store a sample solution if we don't have one.
        if (sampleSolution == null) {
          sampleSolution = this.constructor._resultToSolution(result, this._shape)
        }
      }
    });

    // Send progress one last time to ensure the last solution is sent.
    this._sendProgress();

    this._progressExtraStateFn = null;

    return this._internalSolver.counters.solutions;
  }

  nthSolution(n) {
    let result = this._nthIteration(n, false);
    if (!result) return null;

    return this.constructor._resultToSolution(result, this._shape);
  }

  nthStep(n) {
    let result = this._nthIteration(n, true);
    if (!result) return null;

    return {
      values: this.constructor._resultToSolution(result, this._shape),
      pencilmarks: this.constructor._makePencilmarks(result.grid, this._shape, result.cellOrder),
      isSolution: result.isSolution,
      hasContradiction: result.hasContradiction,
    }
  }

  _nthIteration(n, stepByStep) {
    n++;
    let iter = this._getIter(stepByStep);
    // To go backwards we start from the start.
    if (n < iter.count) {
      this._reset();
      iter = this._getIter(stepByStep);
    }

    // Iterate until we have seen n steps.
    let result = null;
    this._timer.runTimed(() => {
      do {
        result = iter.next();
      } while (iter.count < n);
    });

    if (result.done) return null;
    return result.value;
  }

  solveAllPossibilities() {
    this._reset();

    let valuesInSolutions = new Uint16Array(this._shape.numCells);

    // Send the current values with the progress update, if there have
    // been any changes.
    let lastSize = 0;
    this._progressExtraStateFn = () => {
      let pencilmarks = this.constructor._makePencilmarks(valuesInSolutions, this._shape);
      if (pencilmarks.length == lastSize) return null;
      lastSize = pencilmarks.size;
      return { pencilmarks: pencilmarks };
    };

    this._timer.runTimed(() => {
      this._internalSolver.solveAllPossibilities(valuesInSolutions);
    });

    this._progressExtraStateFn = null;

    return this.constructor._makePencilmarks(valuesInSolutions, this._shape);
  }

  validateLayout() {
    this._reset();

    let result = false;
    this._timer.runTimed(() => {
      result = this._internalSolver.validateLayout();
    });

    return result;
  }

  debugState() {
    if (EXPORT_CONFLICT_HEATMAP) {
      return {
        backtrackTriggers: this._internalSolver.getBacktrackTriggers(),
      };
    } else {
      return null;
    }
  }

  state() {
    const counters = { ...this._internalSolver.counters };

    const state = {
      counters: counters,
      timeMs: this._timer.elapsedMs(),
      done: this._internalSolver.done,
    }

    return state;
  }

  _getIter(yieldEveryStep) {
    yieldEveryStep = !!yieldEveryStep;

    // If an iterator doesn't exist or is of the wrong type, then create it.
    if (!this._iter || this._iter.yieldEveryStep != yieldEveryStep) {
      this._iter = {
        yieldEveryStep: yieldEveryStep,
        iter: new IteratorWithCount(this._internalSolver.run(
          yieldEveryStep
            ? SudokuSolver.InternalSolver.YIELD_ON_STEP
            : SudokuSolver.InternalSolver.YIELD_ON_SOLUTION))
      };
    }

    return this._iter.iter;
  }

  static _resultToSolution(result, shape) {
    const values = result.grid.map(value => LookupTables.toValue(value))
    let solution = [];
    for (const cell of result.cellOrder) {
      solution.push(shape.makeValueId(cell, values[cell]));
    }
    return solution;
  }

  static _makePencilmarks(grid, shape, ignoreCells) {
    let ignoreSet = new Set(ignoreCells);

    let pencilmarks = [];
    for (let i = 0; i < shape.numCells; i++) {
      if (ignoreSet.has(i)) continue;
      let values = grid[i];
      while (values) {
        let value = values & -values;
        pencilmarks.push(shape.makeValueId(i, LookupTables.toValue(value)));
        values &= ~value;
      }
    }
    return pencilmarks;
  }
}

SudokuSolver.InternalSolver = class {

  constructor(handlerGen, shape) {
    this._shape = shape;
    this._numCells = this._shape.numCells;

    this._initCellArray();
    this._cellOrder = new Uint8Array(shape.numCells);
    this._recStack = new Uint16Array(shape.numCells + 1);
    this._progressRatioStack = new Array(shape.numCells + 1);
    this._progressRatioStack.fill(1);

    this._runCounter = 0;
    this._progress = {
      frequencyMask: -1,
      callback: null,
    };

    this._handlerSet = this._setUpHandlers(Array.from(handlerGen));

    this._cellAccumulator = new SudokuSolver.CellAccumulator(this._handlerSet);

    // Priorities go from 0->255, with 255 being the best.
    // This can be used to prioritize which cells to search.
    this._cellPriorities = this._initCellPriorities();

    this.reset();
  }

  _initCellPriorities() {
    const priorities = new Uint8Array(this._shape.numCells);

    // TODO: Determine priorities in a more principaled way.
    //  - Add one for each conflict cell.
    //  - Add custom priorities for each constraint based on how restrictive it
    //    is.

    for (const handler of this._handlerSet) {
      const priority = handler.priority();
      for (const cell of handler.cells) {
        priorities[cell] += priority;
      }
    }

    return priorities;
  }

  static _findCellConflicts(handlers, shape) {
    const cellConflictSets = new Array(shape.numCells);
    for (let i = 0; i < shape.numCells; i++) cellConflictSets[i] = new Set();

    for (const h of handlers) {
      const conflictSet = h.conflictSet();
      for (const c of conflictSet) {
        for (const d of conflictSet) {
          if (c != d) cellConflictSets[c].add(d);
        }
      }
    }

    return cellConflictSets;
  }

  // Invalidate the grid, given the handler which said it was impossible.
  // We invalidate the grid by setting cells to zero. We want to set the
  // most meaningful cells to the user.
  _invalidateGrid(grid, handler) {
    // Try to use the handler cells.
    let cells = handler.cells;
    // Otherwise the cells in the conflict set.
    if (!cells.length) cells = handler.conflictSet();
    cells.forEach(c => grid[c] = 0);

    // Otherwise just set the entire grid to 0.
    if (!cells.length) grid.fill(0);
  }

  _setUpHandlers(handlers) {
    const cellConflictSets = this.constructor._findCellConflicts(handlers, this._shape);

    // Set cell conflicts so that they are unique.
    // Sort them, so they are in a predictable order.
    this._cellConflicts = cellConflictSets.map(c => new Uint8Array(c));
    this._cellConflicts.forEach(c => c.sort((a, b) => a - b));

    const handlerSet = new HandlerSet(handlers, this._shape);

    // Optimize handlers.
    SudokuConstraintOptimizer.optimize(handlerSet, cellConflictSets, this._shape);

    for (const handler of handlerSet) {
      if (!handler.initialize(this._initialGrid, cellConflictSets, this._shape)) {
        this._invalidateGrid(this._initialGrid, handler);
      }
    }

    for (const handler of handlerSet.getAux()) {
      if (!handler.initialize(this._initialGrid, cellConflictSets, this._shape)) {
        this._invalidateGrid(this._initialGrid, handler);
      }
    }

    return handlerSet;
  }

  reset() {
    this._iter = null;
    this.counters = {
      valuesTried: 0,
      cellsSearched: 0,
      backtracks: 0,
      guesses: 0,
      solutions: 0,
      constraintsProcessed: 0,
      progressRatio: 0,
      progressRatioPrev: 0,
      branchesIgnored: 0,
    };

    // _backtrackTriggers counts the the number of times a cell is responsible
    // for finding a contradition and causing a backtrack.
    // Cells with a high count are the best candidates for searching as we
    // may find the contradition faster. Ideally, this allows the search to
    // learn the critical areas of the grid where it is more valuable to search
    // first.
    // _backtrackTriggers are exponentially decayed so that the search can
    // learn new parts of the search space effectively.
    this._backtrackTriggers = Array.from(this._cellPriorities);
    this._uninterestingValues = null;

    this._resetStack();
  }

  getBacktrackTriggers() {
    return this._backtrackTriggers.slice();
  }

  _resetStack() {
    // If we are at the start anyway, then there is nothing to do.
    if (this._atStart) return;

    this._runCounter++;

    this.done = false;
    this._atStart = true;
    this._grids[0].set(this._initialGrid);
    // Re-initialize the cell indexes in the cellOrder.
    // This is not required, but keeps things deterministic.
    for (let i = 0; i < this._numCells; i++) {
      this._cellOrder[i] = i;
    }
    this._progressRatioStack[0] = 1;
  }

  _initCellArray() {
    const numCells = this._numCells;

    let buffer = new ArrayBuffer(
      (numCells + 1) * numCells * Uint16Array.BYTES_PER_ELEMENT);

    this._grids = new Array(numCells + 1);
    for (let i = 0; i < numCells + 1; i++) {
      this._grids[i] = new Uint16Array(
        buffer,
        i * numCells * Uint16Array.BYTES_PER_ELEMENT,
        numCells);
    }
    this._initialGrid = new Uint16Array(numCells);

    const allValues = LookupTables.get(this._shape.numValues).allValues;
    this._initialGrid.fill(allValues);
  }

  _hasInterestingSolutions(grid, uninterestingValues) {
    // We need to check all cells because we maybe validating a cell above
    // us, or finding a value for a cell below us.
    for (let cell = 0; cell < this._numCells; cell++) {
      if (grid[cell] & ~uninterestingValues[cell]) return true;
    }
    return false;
  }

  // Find the best cell and bring it to the front. This means that it will
  // be processed next.
  _updateCellOrder(cellOrder, cellIndex, grid) {
    // Choose cells based on value count and number of conflicts encountered.
    // Return immediately if we find any cells with 1 or 0 values set.
    // NOTE: The constraint handlers are written such that they detect domain
    // wipeouts (0 values), so we should never find them here. Even if they
    // exist, it just means we do a few more useless forced cell resolutions.
    // NOTE: If the scoring is more complicated, it can be useful
    // to do an initial pass to detect 1 or 0 value cells (!(v&(v-1))).

    // Quick check - if the first value is a singleton, then just return without
    // the extra bookkeeping.
    {
      let firstValue = grid[cellOrder[cellIndex]];
      if ((firstValue & (firstValue - 1)) === 0) return 1;
    }

    const numCells = cellOrder.length;

    const triggerCounts = this._backtrackTriggers;

    // Find the cell with the minimum score.
    let minScore = Infinity;
    let bestIndex = 0;

    for (let i = cellIndex; i < numCells; i++) {
      const cell = cellOrder[i];
      const count = countOnes16bit(grid[cell]);
      // If we have a single value then just use it - as it will involve no
      // guessing.
      // NOTE: We could use more efficient check for count() < 1, but it's not
      // worth it as this only happens at most once per loop. The full count()
      // will have to occur anyway for every other iteration.
      if (count <= 1) {
        bestIndex = i;
        break;
      }

      const tc = triggerCounts[cell] || 1;  // Ensure we don't divide by zero.
      const score = count / tc;

      if (score < minScore) {
        bestIndex = i;
        minScore = score;
      }
    }

    [cellOrder[bestIndex], cellOrder[cellIndex]] = [cellOrder[cellIndex], cellOrder[bestIndex]];

    return countOnes16bit(grid[cellOrder[cellIndex]]);
  }

  _enforceValue(grid, cell) {
    let value = grid[cell];

    let cellAccumulator = this._cellAccumulator;
    cellAccumulator.clear();
    cellAccumulator.add(cell);

    const conflicts = this._cellConflicts[cell];
    const numConflicts = conflicts.length;
    for (let i = 0; i < numConflicts; i++) {
      const conflict = conflicts[i];
      if (grid[conflict] & value) {
        if (!(grid[conflict] &= ~value)) return false;
        cellAccumulator.add(conflict);
      }
    }

    // Only enforce aux handlers for the current cell.
    if (!this._enforceAuxHandlers(grid, cell, cellAccumulator)) {
      return false;
    }

    return this._enforceConstraints(grid, cellAccumulator);
  }

  _enforceAuxHandlers(grid, cell, cellAccumulator) {
    const counters = this.counters;

    for (const handler of this._handlerSet.lookupAux(cell)) {
      counters.constraintsProcessed++;
      if (!handler.enforceConsistency(grid, cellAccumulator)) {
        return false;
      }
    }

    return true;
  }

  _enforceConstraints(grid, cellAccumulator) {
    const counters = this.counters;

    while (cellAccumulator.hasConstraints()) {
      counters.constraintsProcessed++;
      const c = cellAccumulator.popConstraint();
      // TODO: Avoid c being added to cellAccumulator during this time.
      if (!c.enforceConsistency(grid, cellAccumulator)) {
        return false;
      }
    }

    return true;
  }

  static YIELD_ON_SOLUTION = 0;
  static YIELD_ON_STEP = 1;

  static _BACKTRACK_DECAY_INTERVAL = 100 * 100;

  // run runs the solve.
  // yieldWhen can be:
  //  YIELD_ON_SOLUTION to yielding each solution.
  //  YIELD_ON_STEP to yield every step.
  //  n > 1 to yield every n contraditions.
  *run(yieldWhen) {
    const yieldEveryStep = yieldWhen === this.constructor.YIELD_ON_STEP;
    const yieldOnContradiction = yieldWhen > 1 ? yieldWhen : 0;

    // Set up iterator validation.
    if (!this._atStart) throw ('State is not in initial state.');
    this._atStart = false;
    let runCounter = ++this._runCounter;
    const checkRunCounter = () => {
      if (runCounter != this._runCounter) throw ('Iterator no longer valid');
    };

    const counters = this.counters;
    counters.progressRatioPrev += counters.progressRatio;
    counters.progressRatio = 0;

    const progressFrequencyMask = this._progress.frequencyMask;

    {
      // Enforce constraints for all cells.
      let cellAccumulator = this._cellAccumulator;
      cellAccumulator.clear();
      for (let i = 0; i < this._numCells; i++) cellAccumulator.add(i);
      this._enforceConstraints(this._grids[0], cellAccumulator);
    }

    if (yieldEveryStep) {
      yield {
        grid: this._grids[0],
        isSolution: false,
        cellOrder: [],
        hasContradiction: false,
      }
      checkRunCounter();
    }

    const progressRatioStack = this._progressRatioStack;
    const cellOrder = this._cellOrder;

    let depth = 0;
    const recStack = this._recStack;
    recStack[depth++] = 0;
    let isNewCellIndex = true;
    let progressDelta = 1;

    while (depth) {
      depth--;
      let cellIndex = recStack[depth];
      let count = 0;

      if (isNewCellIndex) {
        isNewCellIndex = false;

        // TODO: Handle fixed cells.

        let grid = this._grids[depth];

        // We've reached the end, so output a solution!
        if (cellIndex == this._shape.numCells) {
          counters.progressRatio += progressDelta;
          // We've set all the values, and we haven't found a contradiction.
          // This is a solution!
          counters.solutions++;
          yield {
            grid: grid,
            isSolution: true,
            cellOrder: cellOrder,
            hasContradiction: false,
          };
          checkRunCounter();
          continue;
        }

        // Find the next cell to explore.
        count = this._updateCellOrder(cellOrder, cellIndex, grid);
        if (count === 0) {
          continue;
        }

        // Update counters.
        counters.cellsSearched++;
        progressRatioStack[depth] = progressDelta / count;
      }
      progressDelta = progressRatioStack[depth];

      let cell = cellOrder[cellIndex];
      let grid = this._grids[depth];
      let values = grid[cell];

      // Find the next smallest value to try.
      // NOTE: We will always have a value because:
      //        - we would have returned earlier on domain wipeout.
      //        - we don't add to the stack on the final value in a cell.
      let value = values & -values;
      counters.valuesTried++;

      if (values != value) {
        // We only need to start a new recursion frame when there is more than
        // one value to try.

        depth++;  // NOTE: recStack already has cell_index
        counters.guesses++;

        // Remove the value from our set of candidates.
        // NOTE: We only have to do this, because we will return back to this
        //       stack frame.
        grid[cell] &= ~value;

        this._grids[depth].set(grid);
        grid = this._grids[depth];
        grid[cell] = value;
      }

      // Propogate constraints.
      let hasContradiction = !this._enforceValue(grid, cell);
      if (hasContradiction) {
        counters.progressRatio += progressDelta;
        counters.backtracks++;
        // Exponentially decay the counts.
        if (0 === counters.backtracks % this.constructor._BACKTRACK_DECAY_INTERVAL) {
          for (let i = 0; i < this._numCells; i++) {
            this._backtrackTriggers[i] >>= 1;
          }
        }
        this._backtrackTriggers[cell]++;

        if (0 !== yieldOnContradiction &&
          0 === counters.backtracks % yieldOnContradiction) {
          yield {
            grid: grid,
            isSolution: false,
            cellOrder: cellOrder.subarray(0, cellIndex),
            hasContradiction: hasContradiction,
          };
        }
      }

      if ((counters.valuesTried & progressFrequencyMask) === 0) {
        this._progress.callback();
      }
      if (yieldEveryStep) {
        // The value may have been over-written by the constraint enforcer
        // (i.e. if there was a contradiction). Replace it for the output.
        grid[cell] = value;
        yield {
          grid: grid,
          isSolution: false,
          cellOrder: cellOrder.subarray(0, cellIndex),
          hasContradiction: hasContradiction,
        };
        checkRunCounter();
      }

      if (hasContradiction) continue;

      if (this._uninterestingValues) {
        if (!this._hasInterestingSolutions(grid, this._uninterestingValues)) {
          counters.branchesIgnored += progressDelta;
          continue;
        }
      }

      // Recurse to the new cell.
      recStack[depth++] = cellIndex + 1;
      isNewCellIndex = true;
    }

    this.done = true;
  }

  solveAllPossibilities(valuesInSolutions) {
    const counters = this.counters;

    for (const solution of this.run()) {
      solution.grid.forEach((c, i) => { valuesInSolutions[i] |= c; });

      // Once we have 2 solutions, then start ignoring branches which maybe
      // duplicating existing solution (up to this point, every branch is
      // interesting).
      if (counters.solutions == 2) {
        this._uninterestingValues = valuesInSolutions;
      }
    }
  }

  validateLayout() {
    // Choose just the house handlers.
    const houseHandlers = this._handlerSet.getAllofType(SudokuConstraintHandler.House);

    // Function to fill a house with all values.
    const fillHouse = (house) => {
      house.cells.forEach((c, i) => this._grids[0][c] = 1 << i);
    };

    const attemptLog = [];
    // Arbitrary seach limit. Too much lower and there are some cases which get
    // stuck for too long.
    const SEARCH_LIMIT = 200;

    // Function to attempt to solve with one house fixed.
    const attempt = (house) => {
      this._resetStack();

      fillHouse(house);
      // Reduce backtrack triggers so that we don't weight the last runs too
      // heavily.
      // TODO: Do this in a more principled way.
      for (let i = 0; i < this._numCells; i++) {
        this._backtrackTriggers[i] >>= 1;
      }

      for (const result of this.run(SEARCH_LIMIT)) {
        if (result.isSolution) {
          this.counters.branchesIgnored = 1 - this.counters.progressRatio;
          return true;
        }
        attemptLog.push([house, this.counters.progressRatio]);
        return undefined;
      }
      return false;
    };

    // Try doing a short search from every house.
    for (const house of houseHandlers) {
      const result = attempt(house);
      // If the search completed, then we can return the result immediately.
      if (result !== undefined) {
        this.done = true;
        return result;
      }
    }

    // None of the searches completed. Choose the house which had the most
    // progress (i.e. the search covered more of the search space), and do
    // a full search from there.

    // Find the house with the best score.
    attemptLog.sort((a, b) => b[1] - a[1]);
    const besthouse = attemptLog[0][0];

    this._resetStack();
    fillHouse(besthouse);

    // Run the final search until we find a solution or prove that one doesn't
    // exist.
    let result = false;
    for (const result of this.run()) { result = true; break; }

    this.done = true;
    return result;
  }

  setProgressCallback(callback, logFrequency) {
    this._progress.callback = callback;
    this._progress.frequencyMask = -1;
    if (callback) {
      this._progress.frequencyMask = (1 << logFrequency) - 1;
    }
  }
}

SudokuSolver.CellAccumulator = class {
  // NOTE: This is intended to be created once, and reused.
  constructor(handlerSet) {
    this._handlers = handlerSet.getAll();
    this._cellMap = handlerSet.getCellMap();

    this._linkedList = new Int16Array(this._handlers.length);
    this._linkedList.fill(-2);  // -2 = Not in list.
    this._head = -1;  // -1 = null pointer.
  }

  add(cell) {
    const indexes = this._cellMap[cell];
    const numHandlers = indexes.length;
    for (let j = 0; j < numHandlers; j++) {
      const i = indexes[j];
      if (this._linkedList[i] < -1) {
        this._linkedList[i] = this._head;
        this._head = i;
      }
    }
  }

  clear() {
    const ll = this._linkedList;
    let head = this._head;
    while (head >= 0) {
      const newHead = ll[head];
      ll[head] = -2;
      head = newHead;
    }
    this._head = -1;
  }

  hasConstraints() {
    return this._head >= 0;
  }

  head() {
    return this._handlers[this._head];
  }

  popConstraint() {
    const oldHead = this._head;
    this._head = this._linkedList[oldHead];
    this._linkedList[oldHead] = -2;

    return this._handlers[oldHead];
  }
}

class LookupTables {
  static get = memoize((numValues) => {
    return new LookupTables(true, numValues);
  });

  static fromValue = (i) => {
    return 1 << (i - 1);
  };

  static toValue(v) {
    return 32 - Math.clz32(v);
  };

  constructor(do_not_call, numValues) {
    if (!do_not_call) throw ('Use LookupTables.get(shape.numValues)');

    this.allValues = (1 << numValues) - 1;
    this.combinations = 1 << numValues;

    const combinations = this.combinations;

    this.sum = (() => {
      let table = new Uint8Array(combinations);
      for (let i = 1; i < combinations; i++) {
        // SUM is the value of the lowest set bit plus the sum  of the rest.
        table[i] = table[i & (i - 1)] + LookupTables.toValue(i & -i);
      }
      return table;
    })();

    // Combines min and max into a single integer:
    // Layout: [min: 8 bits, max: 8 bits]
    //
    // The extra bits allow these values to be summed to determine the total
    // of mins and maxs.
    this.minMax8Bit = (() => {
      // Initialize the table with MAXs.
      const table = new Uint16Array(combinations);
      table[1] = LookupTables.toValue(1);
      for (let i = 2; i < combinations; i++) {
        // MAX is greater than the max when everything has been decreased by
        // 1.
        table[i] = 1 + table[i >> 1];
      }

      // Add the MINs.
      for (let i = 1; i < combinations; i++) {
        // MIN is the value of the last bit set.
        const min = LookupTables.toValue(i & -i);
        table[i] |= min << 8;
      }

      return table;
    })();

    // Combines useful info about the range of numbers in a cell.
    // Designed to be summed, so that the aggregate stats can be found.
    // Layout: [isFixed: 4 bits, fixed: 8 bits, min: 8 bits, max: 8 bits]
    //
    // Sum of isFixed gives the number of fixed cells.
    // Sum of fixed gives the sum of fixed cells.
    // Min and max as a in minMax.
    this.rangeInfo = (() => {
      const table = new Uint32Array(combinations);
      for (let i = 1; i < combinations; i++) {
        const minMax = this.minMax8Bit[i];
        const fixed = countOnes16bit(i) == 1 ? LookupTables.toValue(i) : 0;
        const isFixed = fixed ? 1 : 0;
        table[i] = (isFixed << 24) | (fixed << 16) | minMax;
      }
      // If there are no values, set a high value for isFixed to indicate the
      // result is invalid. This is intended to be detectable after summing.
      table[0] = numValues << 24;
      return table;
    })();

    this.reverse = (() => {
      let table = new Uint16Array(combinations);
      for (let i = 0; i < combinations; i++) {
        let rev = 0;
        for (let j = 0; j < numValues; j++) {
          rev |= ((i >> j) & 1) << (numValues - 1 - j);
        }
        table[i] = rev;
      }
      return table;
    })();

    const binaryFunctionKey = (fn) => {
      const keyParts = [];
      for (let i = 1; i <= numValues; i++) {
        let part = 0;
        for (let j = 1; j <= numValues; j++) {
          part |= fn(i, j) << j;
        }
        keyParts.push(part);
      }
      return keyParts.join(',');
    };

    this.forBinaryFunction = memoize((fn) => {
      const table = new Uint16Array(combinations);

      // Populate base cases, where there is a single value set.
      for (let i = 0; i < numValues; i++) {
        for (let j = 0; j < numValues; j++) {
          if (fn(i + 1, j + 1)) {
            table[1 << i] |= 1 << j;
          }
        }
      }

      // To fill in the rest, OR together all the valid settings for each value
      // set.
      for (let i = 1; i < combinations; i++) {
        table[i] = table[i & (i - 1)] | table[i & -i];
      }
      return table;
    },
      binaryFunctionKey);
  }
}
