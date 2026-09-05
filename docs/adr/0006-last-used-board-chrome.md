# Last-used Filter, Sort, and Hide persist locally

Filter, Sort, and Hide are one `localStorage` blob. First visit is empty Filter, payload order, and no Hide. After that, last-used is the default, even if Refresh leaves no matching Cards. Search stays session-only. We keep last-used instead of pruning to the current Board so a later Refresh can restore the same view.
