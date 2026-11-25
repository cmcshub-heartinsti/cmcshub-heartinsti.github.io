options(blogdown.hugo.dir = "../hugo-bin/0.162.1")
blogdown::build_site(build_rmd = FALSE)
message("Site built to public/")
