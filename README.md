# Data & BI portfolio

A lightweight Jekyll portfolio for a data analyst and BI developer. It is designed for a GitHub user site and includes structured project data, Markdown posts, an Atom feed, a sitemap, and a custom 404 page.

## Personalize it

Before publishing, replace the example values in `_config.yml`, especially:

- `url` with `https://<username>.github.io` or your verified custom domain;
- the name, initials, location, email, biography, and social links;
- the sample project records in `_data/projects.yml`;
- the sample About copy and `@username` labels in `index.html`;
- `assets/favicon.svg` with your initials or mark.

Set `social.resume` to a site-relative path such as `/assets/resume.pdf` when a résumé is available. Empty project links and the empty résumé link are intentionally not rendered.

## Preview locally

Ruby is not required to publish through GitHub Pages, but it is useful for local previews. After installing Ruby and Bundler:

```sh
bundle install
bundle exec jekyll serve --livereload
```

Open `http://localhost:4000`.

## Publish as a GitHub user site

1. Create a public GitHub repository named exactly `<username>.github.io`.
2. Commit these files to the repository's `main` branch and push them.
3. In **Settings → Pages**, choose **Deploy from a branch**, then **main** and **/(root)**.
4. Wait for the deployment shown in the repository's Pages settings, then visit `https://<username>.github.io`.

This repository is separate from the `<username>` repository that renders a profile README.

## Add a custom domain later

Do not add a `CNAME` file containing an example domain. When the real domain is ready:

1. Verify it in your GitHub account under **Settings → Pages**.
2. In this repository, open **Settings → Pages**, enter the domain under **Custom domain**, and save. GitHub will add the correct `CNAME` file when deploying from a branch.
3. For an apex domain, add GitHub Pages' current `A` records with the DNS provider. Point `www` to `<username>.github.io` with a `CNAME` record.
4. Enable **Enforce HTTPS** after the certificate becomes available.

Always confirm the current DNS values in [GitHub's custom domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) before changing DNS.

## Add writing

Create a file in `_posts` named `YYYY-MM-DD-short-title.md`:

```yaml
---
title: "Article title"
description: "Short summary"
date: 2026-01-01
tags: [power-bi, sql]
---
```

Posts appear automatically on the homepage, writing archive, sitemap, and feed.

