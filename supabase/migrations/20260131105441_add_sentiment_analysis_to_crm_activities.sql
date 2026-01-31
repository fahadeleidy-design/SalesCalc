/*
  # Add Sentiment Analysis Fields to CRM Activities
  
  ## Overview
  Adds sentiment analysis fields to track customer sentiment during interactions
  
  ## Changes
  - Adds sentiment_score (numeric -1 to 1)
  - Adds sentiment_label (positive, negative, neutral)
  - Adds sentiment_summary (text description)
  
  ## Notes
  - These fields are populated by AI sentiment analysis when activities are logged
  - Helps track customer engagement and satisfaction trends
*/

-- Add sentiment analysis columns to crm_activities
ALTER TABLE crm_activities 
  ADD COLUMN IF NOT EXISTS sentiment_score numeric CHECK (sentiment_score BETWEEN -1 AND 1),
  ADD COLUMN IF NOT EXISTS sentiment_label text CHECK (sentiment_label IN ('positive', 'negative', 'neutral')),
  ADD COLUMN IF NOT EXISTS sentiment_summary text;

-- Add index for sentiment queries
CREATE INDEX IF NOT EXISTS idx_crm_activities_sentiment_label 
  ON crm_activities(sentiment_label) 
  WHERE sentiment_label IS NOT NULL;

-- Add comments
COMMENT ON COLUMN crm_activities.sentiment_score IS 'AI-generated sentiment score from -1 (negative) to 1 (positive)';
COMMENT ON COLUMN crm_activities.sentiment_label IS 'Simple sentiment classification: positive, negative, or neutral';
COMMENT ON COLUMN crm_activities.sentiment_summary IS 'Brief AI-generated summary of the sentiment';
