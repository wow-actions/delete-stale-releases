import * as core from '@actions/core'
import * as github from '@actions/github'

export namespace Util {
  export function getOctokit() {
    const token = core.getInput('GITHUB_TOKEN', { required: true })
    return github.getOctokit(token)
  }

  export function getFilter(key: string) {
    const filter = core.getInput(key)
    if (filter) {
      return filter
        .split(/\n/)
        .map((str) => str.trim())
        .filter((str) => str.length > 0)
    }
    return []
  }
}
