require "jekyll"
require "net/http"
require "nokogiri"
require "yaml"

module ProjectReadmes
  ROOT = File.expand_path("..", __dir__)

  def self.source_urls(project)
    repository = project.fetch("repository_url").delete_suffix("/")
    unless repository.match?(%r{\Ahttps://github\.com/[^/]+/[^/]+\z})
      raise ArgumentError, "Expected a GitHub repository URL: #{repository}"
    end

    branch = URI.encode_www_form_component(project.fetch("readme_branch")).gsub("+", "%20")
    path = project.fetch("readme_path").split("/").map do |part|
      URI.encode_www_form_component(part).gsub("+", "%20")
    end.join("/")
    raw = repository.sub("https://github.com/", "https://raw.githubusercontent.com/")
    {
      download: "#{raw}/#{branch}/#{path}",
      links: "#{repository}/blob/#{branch}/#{path}",
      media: "#{raw}/#{branch}/#{path}"
    }
  end

  def self.fetch(url)
    uri = URI(url)
    attempts = 0
    begin
      attempts += 1
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true,
                                open_timeout: 15, read_timeout: 30) do |http|
        http.get(uri.request_uri, "User-Agent" => "pejhan-site-readme-sync")
      end
      raise "HTTP #{response.code} fetching #{url}" unless response.is_a?(Net::HTTPSuccess)

      markdown = response.body.force_encoding(Encoding::UTF_8)
      raise "Empty or invalid UTF-8 README: #{url}" if markdown.strip.empty? || !markdown.valid_encoding?

      markdown
    rescue IOError, SystemCallError, SocketError, Timeout::Error, OpenSSL::SSL::SSLError
      raise if attempts >= 3

      sleep attempts
      retry
    end
  end

  def self.resolve_url(value, base)
    return value if value.empty? || value.start_with?("#", "//") || value.match?(/\A[a-z][a-z0-9+.-]*:/i)

    # Escape spaces and Unicode while preserving existing percent escapes.
    value = URI::DEFAULT_PARSER.escape(value).gsub(/%25([0-9a-f]{2})/i, '%\1')
    # A leading slash in a README refers to the repository root.
    if value.start_with?("/")
      # Nested README paths need the branch root, rather than their directory.
      root = base.match(%r{\Ahttps://github\.com/[^/]+/[^/]+/blob/[^/]+/|\Ahttps://raw\.githubusercontent\.com/[^/]+/[^/]+/[^/]+/})[0]
      URI.join(root, value.delete_prefix("/")).to_s
    else
      URI.join(base, value).to_s
    end
  end

  def self.render(markdown, project, converter)
    urls = source_urls(project)
    document = Nokogiri::HTML.fragment(converter.convert(markdown))
    # The project layout already supplies the page title and logo/cover.
    first = document.element_children.first
    first.remove if first&.name == "h1"

    omit_urls = project.fetch("readme_omit_urls", [])
    document.css("p").each do |paragraph|
      paragraph.remove if omit_urls.include?(paragraph.text.strip)
    end

    document.css("a[href]").each do |link|
      link["href"] = resolve_url(link["href"], urls.fetch(:links))
    end
    document.css("img[src], video[src], audio[src], source[src], video[poster]").each do |media|
      %w[src poster].each do |attribute|
        next unless media[attribute]

        media[attribute] = resolve_url(media[attribute], urls.fetch(:media))
      end
    end
    document.to_html
  end

  def self.sync(root = ROOT)
    projects = YAML.safe_load_file(File.join(root, "_data/side_projects.yml"))
    config = Jekyll.configuration("source" => root, "quiet" => true)
    converter = Jekyll::Converters::Markdown.new(config)
    documentation = projects.to_h do |project|
      markdown = fetch(source_urls(project).fetch(:download))
      html = render(markdown, project, converter)
      puts "Fetched #{project.fetch('slug')}"
      [project.fetch("slug"), html]
    end

    # Publish the generated data only when all READMEs have succeeded.
    # A failed CI run never reaches the deployment step.
    destination = File.join(root, "_data/project_readmes.yml")
    temporary = "#{destination}.tmp"
    begin
      File.write(temporary, YAML.dump(documentation))
      File.rename(temporary, destination)
    ensure
      File.delete(temporary) if File.exist?(temporary)
    end
  end
end

if $PROGRAM_NAME == __FILE__
  begin
    ProjectReadmes.sync
  rescue StandardError => error
    warn "README sync failed: #{error.message}"
    exit 1
  end
end
