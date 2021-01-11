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

  function getReleases(octokit: ReturnType<typeof getOctokit>, page?: number) {
    const context = github.context
    return octokit.repos.listReleases({
      ...context.repo,
      page,
      per_page: 100,
    })
  }

  export async function getAllReleases(octokit: ReturnType<typeof getOctokit>) {
    const res = await getReleases(octokit)
    const releases = res.data || []
    const link = res.headers.link
    const matches = link ? link.match(/[&|?]page=\d+/gim) : null
    if (matches) {
      const nums = matches.map((item) => parseInt(item.split('=')[1], 10))
      const min = Math.min(...nums)
      const max = Math.max(...nums)
      for (let i = min; i <= max; i += 1) {
        const { data } = await getReleases(octokit, i)
        if (data) {
          releases.push(...data)
        }
      }
    }

    return releases
  }
}
