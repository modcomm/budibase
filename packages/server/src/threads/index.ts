import workerFarm from "worker-farm"
import * as env from "../environment"

export const ThreadType = {
  QUERY: "query",
  AUTOMATION: "automation",
}

function typeToFile(type: any) {
  let filename = null
  switch (type) {
    case ThreadType.QUERY:
      filename = "./query"
      break
    case ThreadType.AUTOMATION:
      filename = "./automation"
      break
    default:
      throw "Unknown thread type"
  }
  return require.resolve(filename)
}

export class Thread {
  type: any
  count: any
  disableThreading: any
  workers: any
  timeoutMs: any

  static workerRefs: any[] = []

  constructor(type: any, opts: any = { timeoutMs: null, count: 1 }) {
    this.type = type
    this.count = opts.count ? opts.count : 1
    this.disableThreading =
      env.isTest() ||
      env.DISABLE_THREADING ||
      this.count === 0 ||
      env.isInThread()
    if (!this.disableThreading) {
      const workerOpts: any = {
        autoStart: true,
        maxConcurrentWorkers: this.count,
      }
      if (opts.timeoutMs) {
        this.timeoutMs = opts.timeoutMs
        workerOpts.maxCallTime = opts.timeoutMs
      }
      this.workers = workerFarm(workerOpts, typeToFile(type))
      Thread.workerRefs.push(this.workers)
    }
  }

  run(data: any) {
    return new Promise((resolve, reject) => {
      let fncToCall
      // if in test then don't use threading
      if (this.disableThreading) {
        fncToCall = require(typeToFile(this.type))
      } else {
        fncToCall = this.workers
      }
      fncToCall(data, (err: any, response: any) => {
        if (err && err.type === "TimeoutError") {
          reject(
            new Error(
              `Query response time exceeded ${this.timeoutMs}ms timeout.`
            )
          )
        } else if (err) {
          reject(err)
        } else {
          resolve(response)
        }
      })
    })
  }

  static shutdown() {
    return new Promise<void>(resolve => {
      if (Thread.workerRefs.length === 0) {
        resolve()
      }
      let count = 0
      function complete() {
        count++
        if (count >= Thread.workerRefs.length) {
          resolve()
        }
      }
      for (let worker of Thread.workerRefs) {
        workerFarm.end(worker, complete)
      }
      Thread.workerRefs = []
    })
  }
}
