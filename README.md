# Pezhman Aliabadi — Connecting the Dots

This Jekyll site powers [pejhan.ir](https://pejhan.ir).

The homepage contains Introduction, Blog, Side projects, and About & contact. Blog replaces the former Case notes section; the separate Writing section and archive have been removed.

## Local preview

```sh
bundle install
bundle exec jekyll serve
```

Open http://localhost:4000. Jekyll builds the templates before serving them. If you prefer Python, first run `bundle exec jekyll build`, then `python3 -m http.server 8000 --directory _site --bind 127.0.0.1`.

## Blog

The archive lives at `/blog/` and articles at `/blog/:title/`. Posts in `_posts/` appear on the homepage, archive, Atom feed, and sitemap in publication order.

The first three posts were imported from Pezhman's LinkedIn posts and linked articles, preserving their original publication dates, text, SQL examples, images, and video. Original LinkedIn links appear at the end of each article. Media is stored locally under `assets/images/blog/` and `assets/videos/`.

Post front matter includes `title`, `description`, `date`, `tags`, `image`, `image_alt`, and `source_url`. Use Markdown headings to break up articles and fenced code blocks with a language such as `sql` for dedicated, highlighted code sections. Commenting is disabled.

## Other content

Side projects are maintained in `_data/side_projects.yml`. Each has a `slug` matching its Markdown page under `side-projects/`, using `_layouts/project.html`. Cards link to `/side-projects/:slug/`; project pages include the preview image, README documentation, and repository links. Relative README links resolve to their source files on GitHub.

The Grabgram demo is copied from its README upload into `assets/videos/grabgram-demo.mp4` and plays directly on the project page, with a download link. Its poster lives at `assets/images/side-projects/grabgram-demo.jpg`. Keep these files local so playback does not depend on GitHub attachment links or temporary video URLs.

The same top navigation is available on the homepage, archives, blog posts, and project pages. Blog and Side projects open their archives; Introduction and About return to the corresponding homepage section. The navbar highlights the homepage section in view or the active Blog/Side projects page.

Profile and social links are configured in `_config.yml`. A downloadable résumé can be added through `social.resume`.

Supporting routes: `/feed.xml`, `/sitemap.xml`, and `/404.html`.
