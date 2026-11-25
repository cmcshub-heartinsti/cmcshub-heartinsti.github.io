document.addEventListener('click', function(e) {
  var links = document.getElementById('navLinks');
  var toggle = document.querySelector('.menu-toggle');
  if (links && links.classList.contains('open') && !links.contains(e.target) && !toggle.contains(e.target)) {
    links.classList.remove('open');
  }
});
