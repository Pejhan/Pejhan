# Pezhman Aliabadi — Connecting the Dots

This Jekyll site powers [pejhan.ir](https://pejhan.ir).

The homepage contains Introduction, Blog, Side projects, and About & contact. Blog replaces the former Case notes section; the separate Writing section and archive have been removed.

## Local preview

```sh
bundle install
bundle exec ruby scripts/sync_project_readmes.rb
bundle exec jekyll serve
```

Open http://localhost:4000. Jekyll builds the templates before serving them. If you prefer Python, first run `bundle exec jekyll build`, then `python3 -m http.server 8000 --directory _site --bind 127.0.0.1`.

The sync command downloads the current project READMEs. Run it again whenever you want to refresh them locally; the generated `_data/project_readmes.yml` is ignored by Git. Without generated documentation, project pages link to the README on GitHub.

## Deployment and scheduled README updates

`.github/workflows/pages.yml` fetches all project READMEs, builds the site, and deploys to GitHub Pages on every push to `main`, hourly at minute 17 UTC, and on manual runs. Website rebuilds do not create commits. Public source repositories need no additional secrets; deployment uses GitHub's built-in token.

To activate it:

1. Commit and push these changes to the website repository's `main` branch.
2. Open the repository's **Settings → Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**. Keep the existing custom domain `pejhan.ir`.
3. Open **Actions → Sync project READMEs and deploy site → Run workflow** and select `main` for the first deployment.

Future README edits appear after the next successful scheduled deployment. If any README download or build fails, deployment is skipped and the existing live site stays available. Inspect the workflow logs in the Actions tab to diagnose failures.

GitHub schedules can be delayed. In public repositories, scheduled workflows are disabled after 60 days without repository activity; re-enable the workflow in Actions if the website repository becomes inactive. See [GitHub's schedule documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) and [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

To change the frequency, edit the workflow's `cron` value. For example, `17 */6 * * *` runs every six hours; `17 3 * * *` runs daily at 03:17 UTC (06:47 Tehran time).

Verify the README renderer locally with `bundle exec ruby scripts/test_project_readmes.rb`.

## Blog

The archive lives at `/blog/` and articles at `/blog/:title/`. Posts in `_posts/` appear on the homepage, archive, Atom feed, and sitemap in publication order.

The first three posts were imported from Pezhman's LinkedIn posts and linked articles, preserving their original publication dates, text, SQL examples, images, and video. Original LinkedIn links appear at the end of each article. Media is stored locally under `assets/images/blog/` and `assets/videos/`.

Post front matter includes `title`, `description`, `date`, `tags`, `image`, `image_alt`, and `source_url`. Use Markdown headings to break up articles and fenced code blocks with a language such as `sql` for dedicated, highlighted code sections. Commenting is disabled.

## Other content

Side projects are maintained in `_data/side_projects.yml`. Each has a `slug` matching its Markdown page under `side-projects/`, using `_layouts/project.html`. Cards link to `/side-projects/:slug/`; project pages include the preview image, README documentation, and repository links. Configure `repository_url`, `readme_branch`, and `readme_path` to choose the source Markdown (including files in subdirectories). Titles, card descriptions, covers, and optional page content stay local; edit article documentation in the source repository.

The sync script renders Markdown with the site's Jekyll settings, resolves relative links to GitHub files and relative media to raw repository URLs, and omits the README's leading H1 because the layout supplies the page title. Fenced code is preserved. Imported Markdown is not evaluated as Liquid.

The Grabgram demo is copied from its README upload into `assets/videos/grabgram-demo.mp4` and plays directly on the project page, with a download link. Its poster lives at `assets/images/side-projects/grabgram-demo.jpg`. Keep these files local so playback does not depend on GitHub attachment links or temporary video URLs.

Grabgram's `readme_omit_urls` removes the standalone attachment URL from the imported body because the local player already displays that demo. If the source demo changes, update the local video/poster and this URL together.

The same top navigation is available on the homepage, archives, blog posts, and project pages. Blog and Side projects open their archives; Introduction and About return to the corresponding homepage section. The navbar highlights the homepage section in view or the active Blog/Side projects page.

Profile and social links are configured in `_config.yml`. A downloadable résumé can be added through `social.resume`.

Supporting routes: `/feed.xml`, `/sitemap.xml`, and `/404.html`.
