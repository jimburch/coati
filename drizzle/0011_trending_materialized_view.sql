CREATE MATERIALIZED VIEW trending_setups_mv AS
SELECT
    setup_id,
    COUNT(*)::integer AS recent_stars_count
FROM stars
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY setup_id;

CREATE UNIQUE INDEX trending_setups_mv_setup_id_idx ON trending_setups_mv (setup_id);
