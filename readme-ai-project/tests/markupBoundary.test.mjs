import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const code = name => readFileSync(new URL('../src/' + name, import.meta.url), 'utf8');
const value = 'quoted " & <em>text</em>';
const escaped = 'quoted &quot; &amp; &lt;em&gt;text&lt;/em&gt;';

function createContext(book) {
    const nodes = new Map();
    const node = id => {
        if (!nodes.has(id)) nodes.set(id, {
            options: [], setAttribute() {}, replaceChildren() {}, showModal() {},
            innerHTML: '', insertAdjacentHTML(_, html) { this.innerHTML += html; }
        });
        return nodes.get(id);
    };
    const document = {
        addEventListener() {},
        getElementById: node,
        createElement() {
            return { set textContent(text) { this.innerHTML = String(text)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); } };
        }
    };
    const context = vm.createContext({
        document, appPage: url => url, setCountUp() {},
        BookRepo: { getBookById: () => book }, LogRepo: { getAllLogs: () => [] },
        Option: class {}
    });
    vm.runInContext(code('main.js') + '\n' + code('issue.js') + '\ncreateCover = () => "";', context);
    return { context, node };
}

test('stored book IDs are escaped inside ranking and year-index attributes', () => {
    const book = { id: value, title: 'Книга', author: 'Автор', currentPage: 12, totalPages: 12 };
    const { context, node } = createContext(book);
    context.fixture = [book];
    vm.runInContext('renderTopBooks(fixture);renderIssue(fixture, [], 1);', context);
    for (const id of ['topBooksThisWeek', 'issueContent']) {
        assert.ok(node(id).innerHTML.includes('data-details-book="' + escaped + '"'));
        assert.ok(!node(id).innerHTML.includes('<em>'));
    }
});

test('stored progress and page totals cannot add markup to the management form', () => {
    const { context, node } = createContext({
        id: 123, title: 'Книга', author: 'Автор', currentPage: value, totalPages: value
    });
    vm.runInContext('detailsContext = { bookId: 123 };showBookDetails();', context);
    const { innerHTML } = node('detailsContent');
    assert.ok(innerHTML.includes('value="' + escaped + '"'));
    assert.ok(innerHTML.includes('max="' + escaped + '"'));
    assert.ok(!innerHTML.includes('<em>'));
});
