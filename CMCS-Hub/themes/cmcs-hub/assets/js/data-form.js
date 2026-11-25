(function () {
  var form = document.getElementById('dataForm');
  if (!form) return;

  var receipt       = document.getElementById('formReceipt');
  var receiptTitle  = document.getElementById('receiptTitle');
  var receiptText   = document.getElementById('receiptText');
  var receiptDetail = document.getElementById('receiptDetail');
  var errorEl       = document.getElementById('formError');
  var submitBtn     = document.getElementById('formSubmitBtn');
  var btnText       = submitBtn.querySelector('.btn-text');
  var btnLoading    = submitBtn.querySelector('.btn-loading');
  var datasetField  = document.getElementById('formDataset');
  var submitted     = false;

  // Data Request pills on /publications/ link here as
  // ?dataset=<urlized-title>&publication=<title>. Prefill the hidden fields so
  // the request keeps its provenance.
  (function prefillFromQuery() {
    var q = window.location.search;
    var d = /[?&]dataset=([^&]*)/.exec(q);
    var p = /[?&]publication=([^&]*)/.exec(q);
    var publicationField = document.getElementById('formPublication');
    if (d && datasetField && !datasetField.value) {
      datasetField.value = decodeURIComponent(d[1].replace(/\+/g, ' ')).replace(/-/g, ' ');
    }
    if (p && publicationField && !publicationField.value) {
      publicationField.value = decodeURIComponent(p[1].replace(/\+/g, ' '));
    }
  })();

  // Both attributes are written by the inline script in baseof.html. They are
  // read at submit time (not at load time) so script order does not matter.
  function endpoint()     { return (form.getAttribute('data-endpoint') || '').trim(); }
  function contactEmail() { return (form.getAttribute('data-email')    || '').trim(); }
  function value(id)      { var el = document.getElementById(id); return el ? el.value : ''; }

  function datasetName() {
    var v = datasetField && datasetField.value ? datasetField.value.replace(/\s+/g, ' ').trim() : '';
    return v || 'CMCS-Hub dataset';
  }

  function lockForm() {
    submitted = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    submitBtn.disabled = true;
    errorEl.style.display = 'none';
  }

  function unlockForm() {
    submitted = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    submitBtn.disabled = false;
  }

  function showReceipt(title, text, detail) {
    if (receiptTitle) receiptTitle.textContent = title;
    if (receiptText) receiptText.textContent = text;
    if (receiptDetail) {
      receiptDetail.textContent = detail || '';
      receiptDetail.style.display = detail ? '' : 'none';
    }
    form.style.display = 'none';
    receipt.style.display = 'block';
    errorEl.style.display = 'none';
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    unlockForm();
  }

  // No backend configured: open the visitor's mail client. The request is NOT
  // submitted until they actually press Send, so the receipt says so.
  function openMailClient() {
    var to = contactEmail();
    var subject = encodeURIComponent('Data Access Request: ' + datasetName());
    var body = encodeURIComponent(
      'Name: '         + value('formName')        + '\n' +
      'Email: '        + value('formEmail')       + '\n' +
      'Institution: '  + value('formInstitution') + '\n' +
      'Position: '     + value('formPosition')    + '\n' +
      'Dataset: '      + datasetName()            + '\n' +
      'Publication: '  + value('formPublication') + '\n\n' +
      'Purpose:\n'     + value('formPurpose')
    );

    window.location.href = 'mailto:' + (to ? encodeURIComponent(to) : '') + '?subject=' + subject + '&body=' + body;

    showReceipt(
      'Email Draft Opened',
      'Your email client has been opened with this request pre-filled. Nothing has been sent yet — press Send in your mail app to reach us.',
      to ? 'If no mail window appeared, please write to ' + to + ' directly.' : ''
    );
  }

  // Formspree (or any endpoint accepting multipart POST with Accept: json).
  function submitToEndpoint(ep) {
    var data = new FormData(form);
    if (!data.get('_subject')) data.append('_subject', 'Data Access Request: ' + datasetName());
    if (!data.get('_replyto')) data.append('_replyto', value('formEmail'));

    fetch(ep, {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    }).then(function (res) {
      if (res.ok) {
        showReceipt(
          'Request Received',
          'Thank you for your interest. Your data access request has been submitted successfully. We will review your application and respond within 2-3 business days.',
          'A copy of this request has been recorded by our form provider.'
        );
      } else {
        showError('Submission failed (HTTP ' + res.status + '). Please try again or email us directly at ' + (contactEmail() || 'our team') + '.');
      }
    }).catch(function () {
      showError('Network error. Please check your connection and try again, or email us at ' + (contactEmail() || 'our team') + '.');
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (submitted) return;
    lockForm();

    var ep = endpoint();
    if (ep) {
      submitToEndpoint(ep);
    } else {
      openMailClient();
    }
  });
})();
