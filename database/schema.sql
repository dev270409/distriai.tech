-- DISTRIAI Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Pilot Requests Table
CREATE TABLE IF NOT EXISTS pilot_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    company VARCHAR(255),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'in_call', 'closed'))
);

-- Node Waitlist Table
CREATE TABLE IF NOT EXISTS node_waitlist (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    gpu_type VARCHAR(255),
    country VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'approved', 'active', 'inactive'))
);

-- Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pilot_requests_status ON pilot_requests(status);
CREATE INDEX IF NOT EXISTS idx_pilot_requests_created_at ON pilot_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_node_waitlist_status ON node_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_node_waitlist_created_at ON node_waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);

-- Row Level Security (RLS)
ALTER TABLE pilot_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Policies for service role (allows API to read/write)
CREATE POLICY "Service role can do everything on pilot_requests" ON pilot_requests
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on node_waitlist" ON node_waitlist
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on newsletter_subscribers" ON newsletter_subscribers
    FOR ALL USING (true) WITH CHECK (true);
