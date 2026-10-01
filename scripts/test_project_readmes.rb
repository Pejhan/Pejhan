require "minitest/autorun"
require "tmpdir"
require_relative "sync_project_readmes"

class ProjectReadmesTest < Minitest::Test
  def setup
    @project = {
      "slug" => "example",
      "repository_url" => "https://github.com/Pejhan/example",
      "readme_branch" => "main",
      "readme_path" => "docs/README.md"
    }
    @converter = Jekyll::Converters::Markdown.new(Jekyll.configuration("quiet" => true))
  end

  def test_relative_links_images_and_html_media_resolve_from_readme_directory
    markdown = <<~MARKDOWN
      # <img src="logo.svg"> Example

      [Config](../config.json) [License][license] [Root](/COPYING)
      [Section](#setup) [External](https://example.com) [Email](mailto:hello@example.com)
      [Encoded](a%20b.md)

      ![Preview](images/preview.png)
      <video poster="images/poster.jpg"><source src="../demo.mp4"></video>

      [license]: ../LICENSE

      ```sh
      echo '[Config](../config.json)'
      ```
    MARKDOWN
    document = Nokogiri::HTML.fragment(ProjectReadmes.render(markdown, @project, @converter))
    links = document.css("a").to_h { |link| [link.text, link["href"]] }
    assert_empty document.css("h1")
    assert_equal "https://github.com/Pejhan/example/blob/main/config.json", links["Config"]
    assert_equal "https://github.com/Pejhan/example/blob/main/LICENSE", links["License"]
    assert_equal "https://github.com/Pejhan/example/blob/main/COPYING", links["Root"]
    assert_equal "https://github.com/Pejhan/example/blob/main/docs/a%20b.md", links["Encoded"]
    assert_equal "#setup", links["Section"]
    assert_equal "https://example.com", links["External"]
    assert_equal "mailto:hello@example.com", links["Email"]
    assert_equal "https://raw.githubusercontent.com/Pejhan/example/main/docs/images/preview.png", document.at_css("img")["src"]
    assert_equal "https://raw.githubusercontent.com/Pejhan/example/main/docs/images/poster.jpg", document.at_css("video")["poster"]
    assert_equal "https://raw.githubusercontent.com/Pejhan/example/main/demo.mp4", document.at_css("source")["src"]
    assert_includes document.at_css("pre").text, "echo '[Config](../config.json)'"
  end

  def test_omits_only_the_configured_demo_paragraph
    @project["readme_omit_urls"] = ["https://github.com/user-attachments/assets/demo"]
    markdown = "# Example\n\nhttps://github.com/user-attachments/assets/demo\n\n## Setup\n\nKeep this paragraph.\n"
    document = Nokogiri::HTML.fragment(ProjectReadmes.render(markdown, @project, @converter))
    refute_includes document.text, "user-attachments"
    assert_includes document.text, "Setup"
    assert_includes document.text, "Keep this paragraph."
  end

  def test_encodes_branch_names_for_raw_and_blob_urls
    @project["readme_branch"] = "docs/update"
    assert_equal "https://raw.githubusercontent.com/Pejhan/example/docs%2Fupdate/docs/README.md",
                 ProjectReadmes.source_urls(@project).fetch(:download)
  end

  def test_failed_fetch_preserves_previous_generated_data
    Dir.mktmpdir do |root|
      Dir.mkdir(File.join(root, "_data"))
      projects = [@project, @project.merge("slug" => "another")]
      File.write(File.join(root, "_data/side_projects.yml"), YAML.dump(projects))
      destination = File.join(root, "_data/project_readmes.yml")
      File.write(destination, "previous data")
      calls = 0
      fetch = lambda do |_url|
        calls += 1
        raise "Download failed" if calls == 2

        "# Example\n\nNew documentation."
      end
      ProjectReadmes.stub(:fetch, fetch) do
        assert_raises(RuntimeError) { ProjectReadmes.sync(root) }
      end
      assert_equal "previous data", File.read(destination)
      refute File.exist?("#{destination}.tmp")
    end
  end

  def test_successful_sync_replaces_data_for_all_projects
    Dir.mktmpdir do |root|
      Dir.mkdir(File.join(root, "_data"))
      File.write(File.join(root, "_data/side_projects.yml"), YAML.dump([@project]))
      ProjectReadmes.stub(:fetch, "# Example\n\nUpdated documentation.") do
        ProjectReadmes.sync(root)
      end
      data = YAML.safe_load_file(File.join(root, "_data/project_readmes.yml"))
      assert_includes data.fetch("example"), "Updated documentation."
    end
  end
end
