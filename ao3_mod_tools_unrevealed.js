(function () {
  if (!window.jQuery) {
    alert('jQuery is not loaded yet. Wait for the page to finish loading and try again.');
    return;
  }

  (function ($) {
    var headers = [
      "Title", "Creator", "Link", "Recipient", "Posting Date",
      "creator_status", "collection_status", "unrevealed",
      "Fandoms", "Category", "Relationships", "Characters",
      "Tags", "Rating", "Warnings", "Words", "Chapters", "Summary"
    ].join(",");

    var spacer = " ";
    var items = [];

    function csvEscape(str) {
      if (str == null) str = "";
      str = String(str);
      return '"' + str.replace(/"/g, '""') + '"';
    }

    function parseWorkPage(html) {
      var $doc = $(html);

      var fandoms = $doc.find(".fandoms a, dd.fandom.tags a.tag")
        .map(function () { return $(this).text(); }).get().join(", ");

      var category = $doc.find(".category .tag, dd.category.tags a.tag")
        .map(function () { return $(this).text(); }).get().join(", ");

      var rating = $doc.find(".rating .tag, dd.rating.tags a.tag, .required-tags .rating .text")
        .first().text().trim();

      var warnings = $doc.find(".tags .warnings a, dd.warning.tags a.tag")
        .map(function () { return $(this).text(); }).get().join(", ");

      var relationships = $doc.find(".tags .relationships a, dd.relationship.tags a.tag")
        .map(function () { return $(this).text(); }).get().join(", ");

      var characters = $doc.find(".tags .characters a, dd.character.tags a.tag")
        .map(function () { return $(this).text(); }).get().join(", ");

      var freeforms = $doc.find(".tags .freeforms a, dd.freeform.tags a.tag")
        .map(function () { return $(this).text(); }).get().join(", ");

      var words = $doc.find("dd.words").first().text().replace(/[^\d]/g, "");

      var chapters = '="' + $doc.find("dd.chapters").first().text().trim() + '"';

      var summary = $.trim(
        $doc.find("blockquote.userstuff.summary, .summary .userstuff, .summary")
          .first()
          .children()
          .map(function () { return $(this).clone().append(spacer); })
          .text()
          .replace(/^summary[:\s-]*/i, "")
      );

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
        summary: summary
      };
    }

    function fetchWorkDetails(item) {
      return fetch(item.link, { credentials: "include" })
        .then(function (resp) { return resp.text(); })
        .then(function (html) {
          var meta = parseWorkPage(html);
          Object.assign(item, meta);
        })
        .catch(function (err) {
          console.error("Error fetching", item.link, err);
        });
    }

    function collectItemsFromDoc($doc) {
      $doc.find("li.collection.item.picture.blurb.group").each(function () {
        var $li = $(this);

        var $titleLink = $li.find("> .header.module h4.heading a");
        var title = $titleLink.text().trim();
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
          author: author,
          link: link,
          recipient: recipient,
          date: date,
          creator_status: creator_status,
          collection_status: collection_status,
          unrevealed: unrevealed,
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
            it.author,
            it.link,
            it.recipient,
            it.date,
            it.creator_status,
            it.collection_status,
            it.unrevealed,
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
        a.setAttribute("download", "ao3_mod_unrevealed_work_info_all_pages.csv");
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        console.log("Done. Exported", items.length, "items.");
      });
    });
  })(jQuery);
})();
