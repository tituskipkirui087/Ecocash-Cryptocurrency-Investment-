import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xgotkgxnsupvdzsorlij.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export default async function handler(req, res) {
  const { method, url } = req;
  const path = url.split('?')[0];

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (method === 'OPTIONS') return res.status(200).end();

  if (path === '/api/health') {
    return res.json({ status: 'ok', timestamp: new Date().toISOString(), version: 'supabase-rest-v1' });
  }

  const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
  
  if (!supabase) {
    return res.status(500).json({ success: false, message: 'Supabase not configured' });
  }

  let body = req.body ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) : {};

  if (path === '/api/investments/plans') {
    const { data, error } = await supabase.from('investment_plans').select('*').eq('is_active', true);
    if (error) return res.status(500).json({ success: false, message: error.message, details: error });
    return res.json({ success: true, data });
  }

  return res.status(404).json({ success: false, message: 'Not found' });
}