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

Side projects are maintained in `_data/side_projects.yml`. Profile and social links are configured in `_config.yml`. A downloadable résumé can be added through `social.resume`.

Supporting routes: `/feed.xml`, `/sitemap.xml`, and `/404.html`.
