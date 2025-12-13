-- Migration: Add Community Features
-- Run this SQL in your Supabase SQL Editor to add community gallery features

-- Add isPublic and likes columns to generations table
ALTER TABLE generations
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;

-- Create index for public generations
CREATE INDEX IF NOT EXISTS idx_generations_is_public ON generations(is_public);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generation_id TEXT NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_generation_id ON comments(generation_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generation_id TEXT NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, generation_id)
);

-- Create index for likes
CREATE INDEX IF NOT EXISTS idx_likes_generation_id ON likes(generation_id);

-- Success message
SELECT 'Community features migration completed successfully!' as status;
