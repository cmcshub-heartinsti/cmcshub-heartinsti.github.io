/* CMCS xOmics protein lookup
 * Client-side search over the dataset generated from
 * "NC suppl Table 2-5.xlsx" (see proteome-search-builder/build_data.py).
 */
(function () {
  'use strict';

  var DATA_URL = '/data/proteome-search.json';

  var state = {
    meta: null,
    rows: [],
    index: new Map(),   // KEY -> { kind, rows: [rowIndex] }
    keys: [],           // sorted token list for prefix suggestions
    ready: false,
  };

  var dom = {};

  // ---------------------------------------------------------------- helpers
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function norm(text) {
    return String(text || '').trim().toUpperCase().replace(/[.,;\s]+$/, '');
  }

  function splitLines(cell) {
    if (!cell) return [];
    return String(cell).split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function splitParts(line) {
    return line.split(' | ').map(function (s) { return s.trim(); });
  }

  function idList(cell) {
    if (!cell) return [];
    return String(cell).split(/[;|,]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function prettyNumber(text) {
    if (!text) return '';
    return esc(text).replace(/E([+-])(\d+)/g, function (match, sign, exp) {
      var power = Number(exp);
      if (power === 0) return '';
      return '×10<sup>' + (sign === '-' ? '−' : '') + power + '</sup>';
    });
  }

  // ------------------------------------------------------------ index build
  function addToken(key, kind, rowIndex) {
    if (!key) return;
    var entry = state.index.get(key);
    if (!entry) {
      entry = { kind: kind, rows: [] };
      state.index.set(key, entry);
    }
    if (entry.rows.indexOf(rowIndex) === -1) entry.rows.push(rowIndex);
    if (entry.kind === 'gene' && kind !== 'gene') entry.kind = kind;
  }

  function buildIndex() {
    state.rows.forEach(function (row, i) {
      addToken(norm(row[0]), 'UniProt', i);

      idList(row[1]).forEach(function (gene) {
        addToken(norm(gene), 'gene', i);
      });

      idList(row[2]).forEach(function (ens) {
        addToken(norm(ens), 'Ensembl', i);
      });

      // gene-based test cells carry Ensembl ids as their prefix (columns 18-21)
      for (var c = 17; c <= 20; c += 1) {
        splitLines(row[c]).forEach(function (line) {
          var head = splitParts(line)[0];
          if (/^ENS[A-Z]*\d+/i.test(head || '')) addToken(norm(head), 'Ensembl', i);
        });
      }

      var seen = Object.create(null);
      for (var k = 5; k < state.meta.columns.length; k += 1) {
        var matches = String(row[k] || '').match(/seq\.\d+\.\d+/g);
        if (!matches) continue;
        matches.forEach(function (seq) {
          if (seen[seq]) return;
          seen[seq] = true;
          addToken(norm(seq), 'SOMAmer', i);
        });
      }
    });

    state.keys = Array.from(state.index.keys()).sort();
    state.ready = true;
  }

  // ---------------------------------------------------------------- search
  function exactRows(query) {
    var hit = state.index.get(norm(query));
    return hit ? hit.rows.slice() : [];
  }

  function suggestKeys(query, limit) {
    var key = norm(query);
    if (key.length < 2) return [];
    var out = [];
    var i;
    for (i = 0; i < state.keys.length && out.length < limit; i += 1) {
      if (state.keys[i].indexOf(key) === 0) out.push(state.keys[i]);
    }
    if (out.length < limit) {
      for (i = 0; i < state.keys.length && out.length < limit; i += 1) {
        var k = state.keys[i];
        if (k.indexOf(key) !== 0 && k.indexOf(key) >= 0) out.push(k);
      }
    }
    return out;
  }

  // -------------------------------------------------------------- rendering
  function discoveryRows(row) {
    var order = [];
    var bySeq = Object.create(null);

    function touch(seq) {
      if (!seq) return null;
      if (!bySeq[seq]) {
        bySeq[seq] = { seq: seq, contrast: '', arc: '', p: '', linearity: '', assayP: '' };
        order.push(seq);
      }
      return bySeq[seq];
    }

    splitLines(row[6]).forEach(function (line) {
      var parts = splitParts(line);
      var item = touch(parts[0]);
      if (!item) return;
      item.contrast = parts[1] || '';
      item.arc = parts[2] || '';
    });

    splitLines(row[7]).forEach(function (line) {
      var parts = splitParts(line);
      var item = touch(parts[0]);
      if (item) item.p = (parts[2] || '').replace(/^P=/, '');
    });

    splitLines(row[8]).forEach(function (line) {
      var parts = splitParts(line);
      var item = touch(parts[0]);
      if (!item) return;
      item.linearity = parts[1] || '';
      item.assayP = (parts[2] || '').replace(/^P=/, '');
    });

    return order.map(function (seq) { return bySeq[seq]; });
  }

  function gsmrMatrix(row, cols) {
    var seqOrder = [];
    var bySeq = Object.create(null);

    cols.forEach(function (colIndex) {
      splitLines(row[colIndex]).forEach(function (line) {
        var parts = splitParts(line);
        var seq = parts[0];
        if (!seq) return;
        if (!bySeq[seq]) { bySeq[seq] = {}; seqOrder.push(seq); }
        var value = parts[1] || '';
        var bits = value.split('; P=');
        bySeq[seq][colIndex] = { beta: bits[0] || '', p: bits[1] || '' };
      });
    });

    return seqOrder.map(function (seq) { return { seq: seq, cells: bySeq[seq] }; });
  }

  function geneBasedRows(row, cols) {
    var rows = [];
    cols.forEach(function (colIndex, pos) {
      splitLines(row[colIndex]).forEach(function (line) {
        var parts = splitParts(line);
        var stats = Object.create(null);
        (parts[1] || '').split(';').forEach(function (chunk) {
          var kv = chunk.split('=');
          if (kv.length === 2) stats[kv[0].trim()] = kv[1].trim();
        });
        rows.push({ ensembl: parts[0] || '', traitPos: pos, stats: stats });
      });
    });
    return rows;
  }

  function cell(value, className) {
    return '<td' + (className ? ' class="' + className + '"' : '') + '>' + (value || '<span class="pl-na">—</span>') + '</td>';
  }

  function renderRecord(row, rowIndex) {
    var cols = state.meta.columns;
    var uniprot = esc(row[0]);
    var genes = idList(row[1]);
    var ensembls = idList(row[2]);
    var priority = row[3] || '';
    var linearity = row[4] || '';

    var html = ['<article class="pl-card" id="p-' + uniprot + '">'];

    html.push('<header class="pl-card-head">');
    html.push('<div>');
    html.push('<h2 class="pl-gene">' + esc(genes.join(', ') || uniprot) + '</h2>');
    html.push('<div class="pl-idrow">');
    html.push('<span class="pl-id"><span class="pl-id-label">UniProt</span> ' +
      '<a href="https://www.uniprot.org/uniprotkb/' + encodeURIComponent(row[0]) + '/entry" target="_blank" rel="noopener">' + uniprot + '</a></span>');
    if (ensembls.length) {
      html.push('<span class="pl-id"><span class="pl-id-label">Ensembl</span> ' + ensembls.map(function (e) {
        return '<a href="https://www.ensembl.org/id/' + encodeURIComponent(e) + '" target="_blank" rel="noopener">' + esc(e) + '</a>';
      }).join(', ') + '</span>');
    }
    if (priority) html.push('<span class="pl-badge pl-badge-' + esc(priority.toLowerCase().replace(/[^a-z0-9]+/g, '-')) + '">' + esc(priority) + '</span>');
    if (linearity) html.push('<span class="pl-badge pl-badge-plain">' + esc(linearity) + '</span>');
    html.push('</div>');
    html.push('</div>');
    html.push('<div class="pl-actions">' +
      '<button type="button" class="pl-btn" data-copy="' + uniprot + '">Copy link</button>' +
      '<button type="button" class="pl-btn" data-tsv="' + rowIndex + '">Download TSV</button>' +
      '</div>');
    html.push('</header>');

    // Discovery ------------------------------------------------------------
    var disc = discoveryRows(row);
    html.push('<section class="pl-panel"><h3 class="pl-panel-title">Discovery</h3>');
    if (disc.length) {
      html.push('<div class="pl-table-wrap"><table class="pl-table"><thead><tr>' +
        '<th>SOMAmer</th><th>Contrast</th><th>ARC (%, 95% CI)</th><th>P</th><th>Assay linearity</th><th>Assay P</th>' +
        '</tr></thead><tbody>');
      disc.forEach(function (d) {
        html.push('<tr><td class="pl-mono">' + esc(d.seq) + '</td><td>' + esc(d.contrast) +
          '</td><td>' + esc(d.arc) + '</td><td class="pl-p">' + prettyNumber(d.p) +
          '</td><td>' + esc(d.linearity) + '</td><td class="pl-p">' + prettyNumber(d.assayP) + '</td></tr>');
      });
      html.push('</tbody></table></div>');
    } else {
      html.push('<p class="pl-empty">No discovery data.</p>');
    }
    html.push('</section>');

    // GSMR2 ----------------------------------------------------------------
    [
      { title: 'GSMR2 — whole blood', cols: [9, 10, 11, 12], labels: ['CAD (ADD)', 'MI (ADD)', 'MI (BBJ)', 'IS (BBJ)'] },
      { title: 'GSMR2 — cis', cols: [13, 14, 15, 16], labels: ['CAD (ADD)', 'MI (ADD)', 'MI (BBJ)', 'IS (BBJ)'] },
    ].forEach(function (block) {
      var rows = gsmrMatrix(row, block.cols);
      html.push('<section class="pl-panel"><h3 class="pl-panel-title">' + block.title + '</h3>');
      if (rows.length) {
        html.push('<div class="pl-table-wrap"><table class="pl-table"><thead><tr><th>SOMAmer</th>' +
          block.labels.map(function (l) { return '<th>' + l + '</th>'; }).join('') + '</tr></thead><tbody>');
        rows.forEach(function (r) {
          html.push('<tr><td class="pl-mono">' + esc(r.seq) + '</td>');
          block.cols.forEach(function (colIndex) {
            var c = r.cells[colIndex];
            if (!c) { html.push(cell('')); return; }
            html.push('<td><span class="pl-effect">' + esc(c.beta) + '</span>' +
              '<span class="pl-sub">P=' + prettyNumber(c.p) + '</span></td>');
          });
          html.push('</tr>');
        });
        html.push('</tbody></table></div>');
      } else {
        html.push('<p class="pl-empty">No genetic data.</p>');
      }
      html.push('</section>');
    });

    // Gene-based -----------------------------------------------------------
    var geneRows = geneBasedRows(row, [17, 18, 19, 20]);
    var traitNames = ['CAD ADD', 'MI ADD', 'MI BBJ', 'IS BBJ'];
    html.push('<section class="pl-panel"><h3 class="pl-panel-title">Gene-based test</h3>');
    if (geneRows.length) {
      html.push('<div class="pl-table-wrap"><table class="pl-table"><thead><tr>' +
        '<th>Ensembl gene</th><th>Trait</th><th>mBAT</th><th>combo</th><th>fastBAT</th><th>min</th>' +
        '</tr></thead><tbody>');
      geneRows.forEach(function (g) {
        html.push('<tr><td class="pl-mono">' + esc(g.ensembl) + '</td><td>' + traitNames[g.traitPos] + '</td>' +
          ['mBAT', 'combo', 'fastBAT', 'min'].map(function (key) {
            return '<td class="pl-p">' + prettyNumber(g.stats[key] || '') + '</td>';
          }).join('') + '</tr>');
      });
      html.push('</tbody></table></div>');
    } else {
      html.push('<p class="pl-empty">No gene-based test results.</p>');
    }
    html.push('</section>');

    // Replication ----------------------------------------------------------
    if (row[21] || row[23] || row[24]) {
      html.push('<section class="pl-panel"><h3 class="pl-panel-title">Replication</h3>' +
        '<div class="pl-table-wrap"><table class="pl-table"><thead><tr>' +
        '<th>SOMAmer</th><th>Contrast</th><th>ARC (%, 95% CI)</th><th>P</th></tr></thead><tbody><tr>' +
        '<td class="pl-mono">' + esc(row[21]) + '</td><td>' + esc(row[22]) + '</td><td>' + esc(row[23]) +
        '</td><td class="pl-p">' + prettyNumber(row[24]) + '</td></tr></tbody></table></div></section>');
    }

    html.push('<p class="pl-source">Source row: NC supplementary Table 2-5 · columns: ' + cols.length + ' · empty cells are reported as n.a. in the workbook.</p>');
    html.push('</article>');
    return html.join('');
  }

  function recordLabel(index) {
    var row = state.rows[index];
    var genes = idList(row[1]);
    return (genes.join(', ') || row[0]) + ' · ' + row[0];
  }

  function renderRows(rowIndexes, query) {
    var uniq = [];
    rowIndexes.forEach(function (i) { if (uniq.indexOf(i) === -1) uniq.push(i); });

    dom.results.innerHTML = uniq.map(function (i) { return renderRecord(state.rows[i], i); }).join('');
    dom.status.textContent = uniq.length === 1
      ? '1 result for “' + query + '”'
      : uniq.length + ' results for “' + query + '”';

    if (uniq.length) {
      var id = state.rows[uniq[0]][0];
      history.replaceState(null, '', '?q=' + encodeURIComponent(id));
    }
    dom.status.classList.remove('pl-error');
    attachActions();
  }

  function renderMessage(text, isError) {
    dom.results.innerHTML = '<p class="pl-message' + (isError ? ' pl-error' : '') + '">' + text + '</p>';
    dom.status.textContent = '';
  }

  function attachActions() {
    dom.results.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var url = location.origin + location.pathname + '?q=' + encodeURIComponent(btn.getAttribute('data-copy'));
        var done = function () {
          btn.textContent = 'Link copied';
          setTimeout(function () { btn.textContent = 'Copy link'; }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(done, done);
        } else {
          done();
        }
      });
    });

    dom.results.querySelectorAll('[data-tsv]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = state.rows[Number(btn.getAttribute('data-tsv'))];
        if (!row) return;
        var lines = [state.meta.columns.join('\t')];
        lines.push(row.map(function (c) { return String(c || '').replace(/\t/g, ' ').replace(/\n/g, ' '); }).join('\t'));
        var blob = new Blob([lines.join('\n') + '\n'], { type: 'text/tab-separated-values;charset=utf-8' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = (row[0] || 'record') + '-CMCS-table2-5.tsv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      });
    });
  }

  // ----------------------------------------------------------------- search
  function runSearch(rawQuery, silent) {
    var query = String(rawQuery || '').trim();
    if (!query) { dom.results.innerHTML = ''; dom.status.textContent = ''; return; }

    // several ids at once: split on whitespace / comma and try each
    var chunks = query.split(/[\s,;]+/).filter(Boolean);
    if (chunks.length > 1) {
      var found = [];
      var missing = [];
      chunks.forEach(function (chunk) {
        var rows = exactRows(chunk);
        if (rows.length) found = found.concat(rows); else missing.push(chunk);
      });
      if (found.length) {
        renderRows(found, query);
        if (missing.length) {
          dom.status.textContent += ' · not found: ' + missing.join(', ');
        }
        return;
      }
    }

    var rows = exactRows(query);
    if (rows.length) { renderRows(rows, query); return; }

    var suggestions = suggestKeys(query, 8);
    if (suggestions.length) {
      renderMessage('No exact match for “' + esc(query) + '”. Did you mean: ' +
        suggestions.map(function (key) {
          return '<button type="button" class="pl-suggest-inline" data-key="' + esc(key) + '">' + esc(key) + '</button>';
        }).join(' '));
      dom.results.querySelectorAll('[data-key]').forEach(function (btn) {
        btn.addEventListener('click', function () { runSearch(btn.getAttribute('data-key')); dom.input.value = btn.getAttribute('data-key'); });
      });
      return;
    }

    if (!silent) renderMessage('Nothing found for “' + esc(query) + '”. Check the identifier, or try a gene symbol such as A1CF, a UniProt ID such as Q9NQ94, an Ensembl ID, or a SOMAmer such as seq.12423.38.');
  }

  function fillSuggest(query) {
    var keys = suggestKeys(query, 10);
    if (!keys.length || norm(query).length < 2) { dom.suggest.hidden = true; dom.suggest.innerHTML = ''; return; }

    dom.suggest.innerHTML = keys.map(function (key) {
      var entry = state.index.get(key);
      var names = entry.rows.slice(0, 3).map(function (i) {
        var genes = idList(state.rows[i][1]);
        return esc(genes.join('/') || state.rows[i][0]);
      }).join(', ');
      var extra = entry.rows.length > 3 ? ' +' + (entry.rows.length - 3) : '';
      return '<li role="option"><button type="button" class="pl-option" data-key="' + esc(key) + '">' +
        '<span class="pl-option-key">' + esc(key) + '</span>' +
        '<span class="pl-option-meta">' + esc(entry.kind) + ' · ' + names + extra + '</span></button></li>';
    }).join('');
    dom.suggest.hidden = false;

    dom.suggest.querySelectorAll('[data-key]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        dom.input.value = btn.getAttribute('data-key');
        dom.suggest.hidden = true;
        runSearch(dom.input.value);
      });
    });
  }

  // ------------------------------------------------------------------- init
  function initDom() {
    dom.form = document.getElementById('pl-form');
    dom.input = document.getElementById('pl-input');
    dom.status = document.getElementById('pl-status');
    dom.results = document.getElementById('pl-results');
    dom.suggest = document.getElementById('pl-suggest');
    dom.meta = document.getElementById('pl-meta');
    dom.examples = document.getElementById('pl-examples');
  }

  function start() {
    initDom();
    if (!dom.form) return;

    fetch(DATA_URL, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        state.meta = payload.meta;
        state.rows = payload.rows;
        buildIndex();

        dom.meta.textContent = state.rows.length.toLocaleString() + ' proteins · ' +
          state.keys.length.toLocaleString() + ' identifiers indexed · source: ' + state.meta.source +
          ' (' + state.meta.generated.slice(0, 10) + ')';
        dom.input.disabled = false;
        dom.input.placeholder = 'e.g. Q9NQ94, A1CF, ENSG00000148584, seq.12423.38';

        var q = new URLSearchParams(location.search).get('q');
        if (q) { dom.input.value = q; runSearch(q); }
      })
      .catch(function (err) {
        dom.meta.textContent = 'Could not load the lookup dataset (' + err.message + '). Please retry after a page refresh.';
        dom.meta.classList.add('pl-error');
      });

    dom.form.addEventListener('submit', function (event) {
      event.preventDefault();
      dom.suggest.hidden = true;
      runSearch(dom.input.value);
    });

    var timer = null;
    dom.input.addEventListener('input', function () {
      var value = dom.input.value;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fillSuggest(value);
        if (!value.trim()) { dom.results.innerHTML = ''; dom.status.textContent = ''; }
      }, 160);
    });

    dom.input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { dom.suggest.hidden = true; }
    });

    document.addEventListener('click', function (event) {
      if (!dom.suggest.contains(event.target) && event.target !== dom.input) dom.suggest.hidden = true;
    });

    if (dom.examples) {
      dom.examples.querySelectorAll('[data-example]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          dom.input.value = btn.getAttribute('data-example');
          runSearch(dom.input.value);
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}());
