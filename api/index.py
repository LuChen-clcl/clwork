"""Vercel function entrypoint; the local server remains in app.py."""

from app import TapShowHandler


class handler(TapShowHandler):
    pass
