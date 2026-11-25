#!/usr/bin/env Rscript
args <- commandArgs(trailingOnly = TRUE)
title <- if (length(args) > 0) args[1] else "new-post"
blogdown::new_post(title, kind = "", open = interactive())
