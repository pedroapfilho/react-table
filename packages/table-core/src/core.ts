import { functionalUpdate, RequiredKeys } from './utils'

import {
  Updater,
  TableOptions,
  TableState,
  TableInstance,
  Renderable,
  TableFeature,
  TableGenerics,
  InitialTableState,
} from './types'

import { Columns } from './features/Columns'
import { Rows } from './features/Rows'
import { Cells } from './features/Cells'
import { ColumnSizing } from './features/ColumnSizing'
import { Expanding } from './features/Expanding'
import { Filters } from './features/Filters'
import { Grouping } from './features/Grouping'
import { Ordering } from './features/Ordering'
import { Pagination } from './features/Pagination'
import { Pinning } from './features/Pinning'
import { RowSelection } from './features/RowSelection'
import { Sorting } from './features/Sorting'
import { Visibility } from './features/Visibility'
import { Headers } from './features/Headers'
//

export type CoreTableState = {
  // coreProgress: number
}

export type CoreOptions<TGenerics extends TableGenerics> = {
  data: TGenerics['Row'][]
  state: Partial<TableState>
  onStateChange: (updater: Updater<TableState>) => void
  render: TGenerics['Renderer']
  debugAll?: boolean
  debugTable?: boolean
  debugHeaders?: boolean
  debugColumns?: boolean
  debugRows?: boolean
  initialState?: InitialTableState
  autoResetAll?: boolean
  mergeOptions?: <T>(defaultOptions: T, options: Partial<T>) => T
  meta?: TGenerics['TableMeta']
  // keepPreviousData?: boolean
}

export type CoreInstance<TGenerics extends TableGenerics> = {
  // generics: TGenerics
  initialState: TableState
  reset: () => void
  options: RequiredKeys<TableOptions<TGenerics>, 'state'>
  setOptions: (newOptions: Updater<TableOptions<TGenerics>>) => void
  getState: () => TableState
  setState: (updater: Updater<TableState>) => void
  _queue: (cb: () => void) => void
  _render: <TProps>(
    template: Renderable<TGenerics, TProps>,
    props: TProps
  ) => string | null | TGenerics['Rendered']
  _features: readonly TableFeature[]
  // getOverallProgress: () => number
  // getProgressStage: () =>
  //   | undefined
  //   | 'coreRowModel'
  //   | 'filteredRowModel'
  //   | 'facetedRowModel'
  // createBatch: (priority: keyof CoreBatches) => Batch
  // init: () => void
  // willUpdate: () => void
  // destroy: () => void
  // batches: CoreBatches
}

// export type Batch = {
//   id: number
//   priority: keyof CoreBatches
//   tasks: (() => void)[]
//   schedule: (cb: () => void) => void
//   cancel: () => void
// }

// type CoreBatches = {
//   data: Batch[]
//   facets: Batch[]
// }

// export type TaskPriority = keyof CoreBatches

export function createTableInstance<TGenerics extends TableGenerics>(
  options: TableOptions<TGenerics>
): TableInstance<TGenerics> {
  if (options.debugAll || options.debugTable) {
    console.info('Creating Table Instance...')
  }

  let instance = {
    _features: [
      Columns,
      Rows,
      Cells,
      Headers,
      Visibility,
      Ordering,
      Pinning,
      Filters,
      Sorting,
      Grouping,
      Expanding,
      Pagination,
      RowSelection,
      ColumnSizing,
    ] as const,
  } as unknown as CoreInstance<TGenerics>

  const defaultOptions = instance._features.reduce((obj, feature) => {
    return Object.assign(obj, feature.getDefaultOptions?.(instance))
  }, {}) as TableOptions<TGenerics>

  const mergeOptions = (options: TableOptions<TGenerics>) => {
    if (instance.options.mergeOptions) {
      return instance.options.mergeOptions(defaultOptions, options)
    }

    return {
      ...defaultOptions,
      ...options,
    }
  }

  const coreInitialState: CoreTableState = {
    // coreProgress: 1,
  }

  let initialState = {
    ...coreInitialState,
    ...(options.initialState ?? {}),
  } as TableState

  instance._features.forEach(feature => {
    initialState = feature.getInitialState?.(initialState) ?? initialState
  })

  const queued: (() => void)[] = []
  let queuedTimeout = false

  // let workScheduled = false
  // let working = false
  // let latestCallback: ReturnType<typeof requestIdleCallback>
  // let batchUid = 0
  // const onProgress = () => {}
  // const getBatch = () => {
  //   instance.batches.data = instance.batches.data.filter(d => d.tasks.length)
  //   instance.batches.facets = instance.batches.facets.filter(
  //     d => d.tasks.length
  //   )

  //   return (
  //     instance.batches.data.find(d => d.tasks.length) ??
  //     instance.batches.facets.find(d => d.tasks.length)
  //   )
  // }

  // const startWorkLoop = () => {
  //   working = true

  //   const workLoop = (deadline: IdleDeadline) => {
  //     const batch = getBatch()

  //     if (!batch) {
  //       working = false
  //       return
  //     }
  //     // Prioritize tasks
  //     while (deadline.timeRemaining() > 0 && batch.tasks.length) {
  //       batch.tasks.shift()!()
  //     }

  //     onProgress()

  //     if (working) {
  //       latestCallback = requestIdleCallback(workLoop, { timeout: 10000 })
  //     }
  //   }

  //   latestCallback = requestIdleCallback(workLoop, { timeout: 10000 })
  // }

  // const startWork = () => {
  //   if (getBatch() && !working) {
  //     if (
  //       (process.env.NODE_ENV === 'development' && instance.options.debugAll) ??
  //       instance.options.debugTable
  //     ) {
  //       console.info('Starting work...')
  //     }
  //     startWorkLoop()
  //   }
  // }

  // const stopWork = () => {
  //   if (working) {
  //     if (
  //       (process.env.NODE_ENV === 'development' && instance.options.debugAll) ??
  //       instance.options.debugTable
  //     ) {
  //       console.info('Stopping work...')
  //     }

  //     working = false
  //     cancelIdleCallback(latestCallback)
  //   }
  // }

  const midInstance: CoreInstance<TGenerics> = {
    ...instance,
    // init: () => {
    //   startWork()
    // },
    // willUpdate: () => {
    //   startWork()
    // },
    // destroy: () => {
    //   stopWork()
    // },
    options: {
      ...defaultOptions,
      ...options,
    },
    initialState,
    _queue: cb => {
      queued.push(cb)

      if (!queuedTimeout) {
        queuedTimeout = true

        // Schedule a microtask to run the queued callbacks after
        // the current call stack (render, etc) has finished.
        Promise.resolve()
          .then(() => {
            while (queued.length) {
              queued.shift()!()
            }
            queuedTimeout = false
          })
          .catch(error =>
            setTimeout(() => {
              throw error
            })
          )
      }
    },
    // batches: {
    //   data: [],
    //   facets: [],
    // },
    // createBatch: priority => {
    //   const batchId = batchUid++
    //   let canceled: boolean

    //   const batch: Batch = {
    //     id: batchId,
    //     priority,
    //     tasks: [],
    //     schedule: cb => {
    //       if (canceled) return
    //       batch.tasks.push(cb)

    //       if (!working && !workScheduled) {
    //         workScheduled = true
    //         instance.queue(() => {
    //           workScheduled = false
    //           instance.setState(old => ({ ...old }))
    //         })
    //       }
    //     },
    //     cancel: () => {
    //       canceled = true
    //       batch.tasks = []
    //       instance.batches[priority] = instance.batches[priority].filter(
    //         b => b.id !== batchId
    //       )
    //     },
    //   }

    //   instance.batches[priority].push(batch)

    //   return batch
    // },
    reset: () => {
      instance.setState(instance.initialState)
    },
    setOptions: updater => {
      const newOptions = functionalUpdate(updater, instance.options)
      instance.options = mergeOptions(newOptions)
    },
    _render: (template, props) => {
      if (typeof instance.options.render === 'function') {
        return instance.options.render(template, props)
      }

      if (typeof template === 'function') {
        return (template as Function)(props)
      }

      return template
    },

    getState: () => {
      return instance.options.state as TableState
    },

    setState: (updater: Updater<TableState>) => {
      instance.options.onStateChange?.(updater)
    },

    // getOverallProgress: () => {
    //   const { coreProgress, filtersProgress, facetProgress } =
    //     instance.getState()

    //   return mean(() =>
    //     [coreProgress, filtersProgress].filter(d => d < 1)
    //   ) as number
    // },
    // getProgressStage: () => {
    //   const { coreProgress, filtersProgress, facetProgress } =
    //     instance.getState()

    //   if (coreProgress < 1) {
    //     return 'coreRowModel'
    //   }

    //   if (filtersProgress < 1) {
    //     return 'filteredRowModel'
    //   }

    //   if (Object.values(facetProgress).some(d => d < 1)) {
    //     return 'facetedRowModel'
    //   }
    // },
  }

  instance = Object.assign(instance, midInstance)

  instance._features.forEach(feature => {
    return Object.assign(instance, feature.createInstance?.(instance))
  })

  return instance as TableInstance<TGenerics>
}
