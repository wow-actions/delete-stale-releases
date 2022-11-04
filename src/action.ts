import * as core from '@actions/core'
import * as github from '@actions/github'
import anymatch from 'anymatch'
import { Util } from './util'

export namespace Action {
  export async function run() {
    const { context } = github
    const key = (core.getInput('key') || 'name') as 'name' | 'tag_name'
    const group = core.getInput('group')
    const keepLatestCount = core.getInput('keep_latest_count') || '3'
    const keepLatestDays = core.getInput('keep_latest_days')
    const deleteTags = core.getInput('delete_tags') === 'true'
    const draft = core.getInput('include_draft') !== 'false'
    const prerelease = core.getInput('include_prerelease') !== 'false'

    let keepedCount = parseInt(keepLatestCount, 10)
    if (Number.isNaN(keepedCount) || !Number.isFinite(keepedCount)) {
      keepedCount = 3
    }

    let keepedDays = keepLatestDays ? parseInt(keepLatestDays, 10) : 0
    if (Number.isNaN(keepedDays) || !Number.isFinite(keepedDays)) {
      keepedDays = 0
    }

    const includes = Util.getFilter('include')
    const excludes = Util.getFilter('exclude')
    const octokit = Util.getOctokit()

    core.debug(`includes: ${JSON.stringify(includes, null, 2)}`)
    core.debug(`excludes: ${JSON.stringify(excludes, null, 2)}`)

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

    core.info(`Filtered releases count: ${releases.length}`)
    core.debug(
      `Filtered Releases: ${JSON.stringify(
        releases.map((r) => r.tag_name),
        null,
        2,
      )}`,
    )

    const deletions: any[] = []

    const clean = async (items: typeof releases) => {
      let stales: typeof releases
      if (keepedDays > 0) {
        stales = items.filter((release) => {
          const now = new Date().getTime()
          const old = new Date(release.created_at).getTime()
          const days = (now - old) / (1000 * 60 * 60 * 24)
          return days > keepedDays
        })
      } else if (keepedCount < 0) {
        stales = items
      } else {
        items
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          )
          .slice(keepedCount)
      }

      for (let i = 0, l = stales!.length; i < l; i += 1) {
        const release = stales![i]
        await octokit.rest.repos.deleteRelease({
          ...context.repo,
          release_id: release.id,
        })

        if (deleteTags) {
          await octokit.rest.git.deleteRef({
            ...context.repo,
            ref: `tags/${release.tag_name}`,
          })
          core.info(
            `Delete Release "${release.name}" and associated tag "${release.tag_name}"`,
          )
        } else {
          core.info(`Delete Release "${release.name}"`)
        }
        deletions.push(release)
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

    core.setOutput('releases', deletions)
  }
}
