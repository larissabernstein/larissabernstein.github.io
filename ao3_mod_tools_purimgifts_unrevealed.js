(function () {
  if (!window.jQuery) {
    alert('jQuery is not loaded yet. Wait for the page to finish loading and try again.');
    return;
  }

  (function ($) {
    var headers = [
	  "Title", "Is Draft", "Creator", "Link", "Recipient", "Posting Date",
	  "creator_status", "collection_status", "unrevealed",
	  "Day Tag",
	  "Image Count", "Has Images",
	  "Media Count", "Has Media",
	  "Fandoms", "Category", "Relationships", "Characters",
	  "Tags", "Rating", "Warnings", "Words", "Chapters", "Summary"
	].join(",");

    var spacer = " ";
    var items = [];

    var PURIM_DAY_TAGS = [
      "Collection: Purimgifts Day 1",
      "Collection: Purimgifts Day 2",
      "Collection: Purimgifts Day 3",
      "Collection: Purimgifts Extras"
    ];

    function csvEscape(str) {
      if (str == null) str = "";
      str = String(str);
      return '"' + str.replace(/"/g, '""') + '"';
    }

    function parseWorkPage(html) {
	  var $doc = $(html);
	
	  // Always anchor on the work meta block if present
	  var $meta = $doc.find("dl.work.meta, dl.work.meta.group").first();
	  if (!$meta.length) {
	    // Fallback: some very old/odd layouts, keep old behaviour
	    $meta = $doc;
	  }
	
	  // Fandoms (Fandom / Fandoms)
	  var fandoms = $meta.find("dd.fandom.tags a.tag, dd.fandoms.tags a.tag")
	    .map(function () { return $(this).text(); }).get().join(", ");
	
	  // Category
	  var category = $meta.find("dd.category.tags a.tag")
	    .map(function () { return $(this).text(); }).get().join(", ");
	
	  // Rating
	  var rating = $meta.find("dd.rating.tags a.tag, .required-tags .rating .text")
	    .first().text().trim();
	
	  // Warnings
	  var warnings = $meta.find("dd.warning.tags a.tag, .tags .warnings a.tag")
	    .map(function () { return $(this).text(); }).get().join(", ");
	
	  // Relationships
	  var relationships = $meta.find("dd.relationship.tags a.tag, .tags .relationships a.tag")
	    .map(function () { return $(this).text(); }).get().join(", ");
	
	  // Characters
	  var characters = $meta.find("dd.character.tags a.tag, .tags .characters a.tag")
	    .map(function () { return $(this).text(); }).get().join(", ");
	
	  // Freeforms / Additional Tags
	  var freeformsElems = $meta.find("dd.freeform.tags a.tag, .tags .freeforms a.tag");
	  var freeforms = freeformsElems
	    .map(function () { return $(this).text(); }).get().join(", ");
	
	  // Day tag: exact match against the four Purimgifts tags
	  var dayTag = "";
	  freeformsElems.each(function () {
	    var t = $(this).text().trim();
	    if (PURIM_DAY_TAGS.indexOf(t) !== -1) {
	      dayTag = t;
	    }
	  });
	
	  // Words / Chapters
	  var words = $meta.find("dd.words").first().text().replace(/[^\d]/g, "");
	
	  var chapters = '="' + $meta.find("dd.chapters").first().text().trim() + '"';
	
	  // Summary: prefer the summary block inside #workskin, but keep all fallbacks
	  var $summaryEl = $doc.find("#workskin .summary blockquote.userstuff")
	    .first();
	
	  if (!$summaryEl.length) {
	    $summaryEl = $doc.find("blockquote.userstuff.summary, .summary .userstuff, .summary").first();
	  }
	
	  var summary = $.trim(
	    $summaryEl
	      .clone()               // avoid modifying the DOM
	      .children()
	      .addBack()             // include text on the blockquote itself
	      .map(function () {
	        return $(this).text();
	      })
	      .get()
	      .join(" ")
	      .replace(/^summary[:\s-]*/i, "")
	  );
	
	  // Embedded media counts + yes/no
		var imageCount = $doc.find(".userstuff img, .workskin img").length;
		var hasImages = imageCount > 0 ? "yes" : "no";
		
		var mediaCount = $doc.find(
		  ".userstuff audio, .workskin audio, " +
		  ".userstuff video, .workskin video, " +
		  ".userstuff iframe, .workskin iframe, " +
		  ".userstuff embed, .workskin embed"
		).length;
		var hasMedia = mediaCount > 0 ? "yes" : "no";
		
		return {
		  fandoms: fandoms,
		  category: category,
		  relationships: relationships,
		  characters: characters,
		  tags: freeforms,
		  rating: rating,
		  warnings: warnings,
		  words: words,
		  chapters: chapters,
		  summary: summary,
		  dayTag: dayTag,
		  imageCount: imageCount,
		  hasImages: hasImages,
		  mediaCount: mediaCount,
		  hasMedia: hasMedia
		};
    }

    function fetchWorkDetails(item) {
	  // Skip metadata fetch for drafts – mods can't access the work page
	  if (item.isDraft) {
	    console.warn("Skipping metadata fetch for draft:", item.title);
	    return Promise.resolve();
	  }
	
	  // Force "Entire Work" view so we see media in *all* chapters
	  var url = item.link;
	  if (url.indexOf("view_full_work=") === -1) {
	    url += (url.indexOf("?") === -1 ? "?" : "&") + "view_full_work=true";
	  }
	
	  return fetch(url, { credentials: "include" })
	    .then(function (resp) { return resp.text(); })
	    .then(function (html) {
	      var meta = parseWorkPage(html);
	      Object.assign(item, meta);
	    })
	    .catch(function (err) {
	      console.error("Error fetching", url, err);
	    });
	}

    function collectItemsFromDoc($doc) {
      $doc.find("li.collection.item.picture.blurb.group").each(function () {
        var $li = $(this);

        var $titleLink = $li.find("> .header.module h4.heading a");
        var rawTitle = $titleLink.text().trim();

        // Drafts: titles ending in "(Draft)"
        var isDraft = /\(Draft\)\s*$/.test(rawTitle);

        // Keep title exactly as AO3 shows it (including "(Draft)")
        var title = rawTitle;
        var link = "https://archiveofourown.org" + $titleLink.attr("href");

        var $h5 = $li.find("> .header.module h5.heading").first();
        var $h5Clone = $h5.clone();
        $h5Clone.find(".recipients").remove();
        var author = $.trim($h5Clone.text().replace(/\s+/g, " "));

        var recipient = $h5.find(".recipients .user")
          .map(function () { return $(this).text(); }).get().join(", ");

        var date = $li.find("> .header.module p.datetime").text().trim();

        var creator_status = $li.find("li.user.status select option:selected").text().trim();
        var collection_status = $li.find("li.collection.status select option:selected").text().trim();

        var unrevealed = $li.find("input[type=checkbox][name$='[unrevealed]']").is(":checked")
          ? "unrevealed"
          : "revealed";

        items.push({
		  title: title,
		  isDraft: isDraft,
		  author: author,
		  link: link,
		  recipient: recipient,
		  date: date,
		  creator_status: creator_status,
		  collection_status: collection_status,
		  unrevealed: unrevealed,
		  dayTag: "",
		  imageCount: 0,
		  hasImages: "no",
		  mediaCount: 0,
		  hasMedia: "no",
		  fandoms: "",
		  category: "",
		  relationships: "",
		  characters: "",
		  tags: "",
		  rating: "",
		  warnings: "",
		  words: "",
		  chapters: "",
		  summary: ""
		});
      });
    }

    function getNextHref($doc) {
      var href = $doc.find("ol.pagination.actions li.next a[rel=next]").attr("href");
      if (!href) return null;
      return new URL(href, window.location.origin).toString();
    }

    function processNextCollectionPage(nextUrl) {
      if (!nextUrl) return Promise.resolve();
      console.log("Fetching collection page:", nextUrl);
      return fetch(nextUrl, { credentials: "include" })
        .then(function (resp) { return resp.text(); })
        .then(function (html) {
          var $doc = $(html);
          collectItemsFromDoc($doc);
          var more = getNextHref($doc);
          return processNextCollectionPage(more);
        })
        .catch(function (err) {
          console.error("Error fetching collection page:", nextUrl, err);
        });
    }

    var $current = $(document);
    collectItemsFromDoc($current);
    var firstNext = getNextHref($current);

    processNextCollectionPage(firstNext).then(function () {
      if (!items.length) {
        alert("No collection items found.");
        return;
      }

      console.log("Collected", items.length, "items. Fetching work details…");

      return Promise.all(items.map(fetchWorkDetails)).then(function () {
        var output = headers + "\r\n";
        items.forEach(function (it) {
          var fields = [
			  it.title,
			  it.isDraft ? "yes" : "",
			  it.author,
			  it.link,
			  it.recipient,
			  it.date,
			  it.creator_status,
			  it.collection_status,
			  it.unrevealed,
			  it.dayTag,
			  it.imageCount,
			  it.hasImages,
			  it.mediaCount,
			  it.hasMedia,
			  it.fandoms,
			  it.category,
			  it.relationships,
			  it.characters,
			  it.tags,
			  it.rating,
			  it.warnings,
			  it.words,
			  it.chapters,
			  it.summary
			].map(csvEscape);

          output += fields.join(",") + "\r\n";
        });

        var a = document.createElement("a");
        a.setAttribute(
          "href",
          "data:text/csv;charset=utf-8," + encodeURIComponent("\ufeff" + output)
        );
        a.setAttribute("download", "ao3_purimgifts_unrevealed_all_pages.csv");
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        console.log("Done. Exported", items.length, "items.");
      });
    });
  })(jQuery);
})();
