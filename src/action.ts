import * as core from '@actions/core'
import * as github from '@actions/github'
import anymatch from 'anymatch'
import { Util } from './util'

export namespace Action {
  export async function run() {
    const context = github.context
    const key = (core.getInput('key') || 'name') as 'name' | 'tag_name'
    const group = core.getInput('group')
    const keepLatestCount = core.getInput('keep_latest_count') || '3'
    const keepLatestDays = core.getInput('keep_latest_days')
    const deleteTags = core.getInput('delete_tags') === 'true'
    let latestCount = parseInt(keepLatestCount, 10)
    if (isNaN(latestCount)) {
      latestCount = 3
    }
    const latestDays = parseInt(keepLatestDays, 10)
    const draft = core.getInput('include_draft') !== 'false'
    const prerelease = core.getInput('include_prerelease') !== 'false'
    const includes = Util.getFilter('include')
    const excludes = Util.getFilter('exclude')
    const octokit = Util.getOctokit()

    const all = await Util.getAllReleases(octokit)
    const releases = all.filter((release) => {
      const val = release[key] || ''
      const included = includes.length <= 0 || anymatch(includes, val)
      if (included) {
        if (release.draft && !draft) {
          return false
        }

        if (release.prerelease && !prerelease) {
          return false
        }

        return excludes.length <= 0 || !anymatch(excludes, val)
      }

      return false
    })

    const clean = async (items: typeof releases) => {
      const stales = latestDays
        ? items.filter((release) => {
            const now = new Date().getTime()
            const old = new Date(release.created_at).getTime()
            const days = (now - old) / (1000 * 60 * 60 * 24)
            return days > latestDays
          })
        : items.length < latestCount
        ? items
        : items
            .sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            )
            .slice(latestCount)

      for (let i = 0, l = stales.length; i < l; i += 1) {
        const release = stales[i]
        await octokit.repos.deleteRelease({
          ...context.repo,
          release_id: release.id,
        })
        core.info(`Delete Release "${release.name}"`)

        if (deleteTags) {
          await octokit.git.deleteRef({
            ...context.repo,
            ref: `tags/${release.tag_name}`,
          })
          core.info(
            `Delete tag "${release.tag_name}" associated with release "${release.name}"`,
          )
        }
      }
    }

    if (group) {
      const groups: { [name: string]: typeof releases } = {}
      releases.forEach((release) => {
        const name = release.name
          ? release.name.replace(new RegExp(group, 'ig'), '')
          : ''
        if (!groups[name]) {
          groups[name] = []
        }

        groups[name].push(release)
      })

      const groupNames = Object.keys(groups)
      core.info(`Groups: ${JSON.stringify(groupNames, null, 2)}`)
      for (let i = 0, l = groupNames.length; i < l; i += 1) {
        await clean(groups[groupNames[i]])
      }
    } else {
      await clean(releases)
    }
  }
}
