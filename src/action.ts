import * as core from '@actions/core'
import * as github from '@actions/github'
import anymatch from 'anymatch'
import { Util } from './util'

export namespace Action {
  export async function run() {
    const context = github.context
    const key = (core.getInput('key') || 'name') as 'name' | 'tag_name'
    const draft = core.getInput('include_draft') !== 'false'
    const prerelease = core.getInput('include_prerelease') !== 'false'
    const includes = Util.getFilter('include')
    const excludes = Util.getFilter('exclude')
    const octokit = Util.getOctokit()

    const res = await octokit.repos.listReleases({
      ...context.repo,
      per_page: 100,
    })

    console.log(res)
    console.log(res.data.length)

    const releases = res.data
      .filter((release) => {
        if (release.draft && !draft) {
          return false
        }

        if (release.prerelease && !prerelease) {
          return false
        }

        const raw = release[key] || ''
        const included = includes.length <= 0 || anymatch(raw, includes)
        if (included) {
          return excludes.length <= 0 || !anymatch(raw, excludes)
        }

        return false
      })
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )

    console.log(releases)

    // for (let i = 0, l = releases.length; i < l; i += 1) {
    //   const release = releases[i]
    //   await octokit.repos.deleteRelease({
    //     ...context.repo,
    //     release_id: release.id,
    //   })
    // }
  }
}
