create unique index if not exists gtm_signals_source_type_product_idx
  on gtm_signals (source, signal_type, product);
