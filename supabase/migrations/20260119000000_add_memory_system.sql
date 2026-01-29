--------------- DAILY SUMMARIES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS daily_summaries (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,

    -- REQUIRED FIELDS
    date DATE NOT NULL,
    summary TEXT NOT NULL CHECK (char_length(summary) <= 10000),

    -- OPTIONAL FIELDS
    message_count INT DEFAULT 0,
    key_topics TEXT[] DEFAULT '{}',

    -- CONSTRAINTS
    UNIQUE(user_id, workspace_id, date),
    CONSTRAINT check_key_topics_length CHECK (array_length(key_topics, 1) <= 20)
);

-- INDEXES --

CREATE INDEX idx_daily_summaries_user_id ON daily_summaries (user_id);
CREATE INDEX idx_daily_summaries_workspace_id ON daily_summaries (workspace_id);
CREATE INDEX idx_daily_summaries_date ON daily_summaries (user_id, workspace_id, date DESC);
CREATE INDEX idx_daily_summaries_key_topics ON daily_summaries USING gin(key_topics);

-- RLS --

ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own daily_summaries"
    ON daily_summaries
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_daily_summaries_updated_at
BEFORE UPDATE ON daily_summaries
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- COMMENTS --

COMMENT ON TABLE daily_summaries IS 'Stores daily summaries of user conversations for context injection and history retrieval';
COMMENT ON COLUMN daily_summaries.date IS 'The date this summary covers (YYYY-MM-DD)';
COMMENT ON COLUMN daily_summaries.summary IS 'Markdown-formatted summary of the day''s conversations';
COMMENT ON COLUMN daily_summaries.message_count IS 'Total number of messages on this day';
COMMENT ON COLUMN daily_summaries.key_topics IS 'Array of key topics/tags extracted from conversations';

--------------- KNOWLEDGE ENTRIES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS knowledge_entries (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- OPTIONAL RELATIONSHIPS
    source_chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
    source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,

    -- REQUIRED FIELDS
    type TEXT NOT NULL CHECK (type IN ('lesson', 'highlight', 'inspiration')),
    content TEXT NOT NULL CHECK (char_length(content) >= 5 AND char_length(content) <= 500),

    -- OPTIONAL FIELDS
    tags TEXT[] DEFAULT '{}',

    -- CONSTRAINTS
    CONSTRAINT check_tags_length CHECK (array_length(tags, 1) <= 10)
);

-- INDEXES --

CREATE INDEX idx_knowledge_entries_user_id ON knowledge_entries (user_id);
CREATE INDEX idx_knowledge_entries_workspace_id ON knowledge_entries (workspace_id);
CREATE INDEX idx_knowledge_entries_type ON knowledge_entries (user_id, workspace_id, type, created_at DESC);
CREATE INDEX idx_knowledge_entries_tags ON knowledge_entries USING gin(tags);
CREATE INDEX idx_knowledge_entries_source_chat ON knowledge_entries (source_chat_id);
CREATE INDEX idx_knowledge_entries_created_at ON knowledge_entries (user_id, workspace_id, created_at DESC);

-- FULL TEXT SEARCH INDEX --

ALTER TABLE knowledge_entries ADD COLUMN content_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX idx_knowledge_entries_content_tsv ON knowledge_entries USING gin(content_tsv);

-- RLS --

ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own knowledge_entries"
    ON knowledge_entries
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_knowledge_entries_updated_at
BEFORE UPDATE ON knowledge_entries
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- COMMENTS --

COMMENT ON TABLE knowledge_entries IS 'Stores user-specific lessons, highlights, and inspirations extracted from conversations';
COMMENT ON COLUMN knowledge_entries.type IS 'Type of knowledge: lesson (mistakes/learnings), highlight (successes), or inspiration (ideas)';
COMMENT ON COLUMN knowledge_entries.content IS 'Short, actionable knowledge entry (5-500 characters)';
COMMENT ON COLUMN knowledge_entries.tags IS 'Related tags for categorization and filtering';
COMMENT ON COLUMN knowledge_entries.source_chat_id IS 'Optional: The chat where this knowledge was extracted from';
COMMENT ON COLUMN knowledge_entries.source_message_id IS 'Optional: The specific message where this knowledge was extracted from';
COMMENT ON COLUMN knowledge_entries.content_tsv IS 'Full-text search vector for content';

--------------- HELPER FUNCTIONS ---------------

-- Function to get recent daily summaries
CREATE OR REPLACE FUNCTION get_recent_summaries(
    p_user_id UUID,
    p_workspace_id UUID,
    p_days INT DEFAULT 7
)
RETURNS TABLE (
    id UUID,
    date DATE,
    summary TEXT,
    message_count INT,
    key_topics TEXT[],
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ds.id,
        ds.date,
        ds.summary,
        ds.message_count,
        ds.key_topics,
        ds.created_at
    FROM daily_summaries ds
    WHERE ds.user_id = p_user_id
        AND ds.workspace_id = p_workspace_id
        AND ds.date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
    ORDER BY ds.date DESC
    LIMIT p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search knowledge entries by content
CREATE OR REPLACE FUNCTION search_knowledge_entries(
    p_user_id UUID,
    p_workspace_id UUID,
    p_query TEXT,
    p_type TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    type TEXT,
    content TEXT,
    tags TEXT[],
    source_chat_id UUID,
    created_at TIMESTAMPTZ,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ke.id,
        ke.type,
        ke.content,
        ke.tags,
        ke.source_chat_id,
        ke.created_at,
        ts_rank(ke.content_tsv, websearch_to_tsquery('english', p_query)) AS rank
    FROM knowledge_entries ke
    WHERE ke.user_id = p_user_id
        AND ke.workspace_id = p_workspace_id
        AND (p_type IS NULL OR ke.type = p_type)
        AND (p_tags IS NULL OR ke.tags && p_tags)
        AND (p_query = '' OR ke.content_tsv @@ websearch_to_tsquery('english', p_query))
    ORDER BY rank DESC, ke.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get knowledge entries statistics
CREATE OR REPLACE FUNCTION get_knowledge_stats(
    p_user_id UUID,
    p_workspace_id UUID
)
RETURNS TABLE (
    total_count BIGINT,
    lesson_count BIGINT,
    highlight_count BIGINT,
    inspiration_count BIGINT,
    unique_tags_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_count,
        COUNT(*) FILTER (WHERE type = 'lesson')::BIGINT as lesson_count,
        COUNT(*) FILTER (WHERE type = 'highlight')::BIGINT as highlight_count,
        COUNT(*) FILTER (WHERE type = 'inspiration')::BIGINT as inspiration_count,
        (SELECT COUNT(DISTINCT tag)::BIGINT
         FROM knowledge_entries ke, unnest(ke.tags) AS tag
         WHERE ke.user_id = p_user_id AND ke.workspace_id = p_workspace_id) as unique_tags_count
    FROM knowledge_entries
    WHERE user_id = p_user_id
        AND workspace_id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for duplicate knowledge entries
CREATE OR REPLACE FUNCTION check_duplicate_knowledge(
    p_user_id UUID,
    p_workspace_id UUID,
    p_type TEXT,
    p_content TEXT,
    p_similarity_threshold REAL DEFAULT 0.85
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ke.id,
        ke.content,
        similarity(ke.content, p_content) AS similarity
    FROM knowledge_entries ke
    WHERE ke.user_id = p_user_id
        AND ke.workspace_id = p_workspace_id
        AND ke.type = p_type
        AND similarity(ke.content, p_content) >= p_similarity_threshold
    ORDER BY similarity DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_trgm extension for similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
