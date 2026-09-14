import unittest
from pathlib import Path
from unittest import mock
import test_backend

class FileLinkTests(unittest.TestCase):
    setUp = test_backend.WorkspaceTests.setUp
    git = test_backend.WorkspaceTests.git

    def test_general_files_and_external_terminal_cwd(self):
        ws = self.backend.ws('genral')
        folder = Path(ws['path'])
        (folder / 'notes.md').write_text('General notes')
        self.assertEqual(self.backend.file('genral', '@workspace', 'notes.md')['text'], 'General notes')
        self.assertIn('notes.md', [e['name'] for e in self.backend.files('genral', '@workspace')['entries']])
        result = self.backend.resolve_links('genral', ws['terminals'][0]['id'], ['notes.md', 'missing.md', '.'])
        self.assertEqual(result[0]['path'], str(folder / 'notes.md'))
        self.assertEqual(result[1:], [None, None])
        elsewhere = folder.parent / 'outside'
        elsewhere.mkdir()
        (elsewhere / 'with spaces.txt').write_text('Outside file')
        ws['terminals'][0]['started'] = True
        self.backend.save_ws(ws)
        with mock.patch.object(test_backend.magi, 'run', return_value=str(elsewhere).encode()):
            result = self.backend.resolve_links('genral', ws['terminals'][0]['id'], ['with spaces.txt'])
        self.assertEqual(self.backend.file('genral', **result[0])['text'], 'Outside file')
        with self.assertRaises(ValueError): self.backend.file('genral', '@workspace', '../outside/with spaces.txt')
