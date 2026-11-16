// Checks that the public API has JSDoc: exported classes, functions and enums, and the public members of exported classes
// (a property counts as documented when it has a comment or a comment before its `this.name = ...` assignment in the constructor).
// Usage: node scripts/check-jsdoc.mjs
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/**
 * Collects the TypeScript files of a directory
 *
 * @param {string} dir Directory
 *
 * @returns {Array<string>} File paths
 */
function collect(dir) {
    return readdirSync(dir).flatMap(name => {
        const path = join(dir, name);

        if(statSync(path).isDirectory()) return name === 'types' ? [] : collect(path);

        return path.endsWith('.ts') && !path.endsWith('.d.ts') ? [path] : [];
    })
}

const missing = [];
let checked = 0;

for(const file of collect(join(root, 'src'))) {
    const source = ts.createSourceFile(file, ts.sys.readFile(file) ?? '', ts.ScriptTarget.Latest, true);
    const text = source.getFullText();

    const hasDoc = node => ts.getJSDocCommentsAndTags(node).some(tag => ts.isJSDoc(tag));
    const report = (node, name) => {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart());

        missing.push(`${relative(root, file)}:${line + 1} ${name}`);
    }
    const isExported = node => (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;

    for(const statement of source.statements) {
        if(!isExported(statement)) continue;

        if(ts.isFunctionDeclaration(statement) && statement.name) {
            checked++;

            if(!hasDoc(statement) && !/@private/.test(text.slice(statement.getFullStart(), statement.getStart()))) report(statement, `function ${statement.name.text}`);
        }

        if(ts.isEnumDeclaration(statement)) {
            checked++;

            if(!hasDoc(statement)) report(statement, `enum ${statement.name.text}`);
        }

        if(!ts.isClassDeclaration(statement) || !statement.name) continue;

        checked++;

        const className = statement.name.text;
        const classDoc = text.slice(statement.getFullStart(), statement.getStart());

        if(!hasDoc(statement)) report(statement, `class ${className}`);
        if(/@private/.test(classDoc)) continue;

        // Names of the properties that are documented in the constructor
        const documented = new Set();
        const constructor = statement.members.find(ts.isConstructorDeclaration);

        constructor?.body?.statements.forEach(item => {
            if(!ts.isExpressionStatement(item) || !ts.isBinaryExpression(item.expression)) return;

            const left = item.expression.left;

            if(ts.isPropertyAccessExpression(left) && left.expression.kind === ts.SyntaxKind.ThisKeyword && hasDoc(item)) documented.add(left.name.text);
        })

        for(const member of statement.members) {
            const flags = ts.getCombinedModifierFlags(member);
            if(flags & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) continue;

            const name = member.name?.getText(source) ?? 'constructor';
            if(name.startsWith('#') || name.startsWith('_')) continue;
            if(/@private/.test(text.slice(member.getFullStart(), member.getStart()))) continue;

            checked++;

            if(ts.isConstructorDeclaration(member) || ts.isMethodDeclaration(member) || ts.isGetAccessor(member)) {
                if(!hasDoc(member)) report(member, `${className}.${name}`);
            }else if(ts.isPropertyDeclaration(member)) {
                if(!hasDoc(member) && !documented.has(name)) report(member, `${className}.${name}`);
            }
        }
    }
}

if(missing.length) {
    console.error(`JSDoc is missing for ${missing.length} public API item(s):\n${missing.map(item => `  ${item}`).join('\n')}`);

    process.exit(1);
}

console.log(`JSDoc check passed (${checked} public API items).`);
