import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import LessonLink from '@/components/yo/learning/LessonLink';
const onClick=()=>{};
for(const locale of ['fr','en','es']) {
 const href=`/yo/langues/italien/parcours/u01/vocabulaire?lang=${locale}`;
 const link=LessonLink({href,target:'_blank',rel:'noopener',prefetch:true,onClick,children:'Print'});
 assert.equal(link.props.prefetch,false);
 assert.equal(link.props.href,href);
 assert.equal(link.props.target,'_blank');assert.equal(link.props.rel,'noopener');assert.equal(link.props.onClick,onClick);
}
const source=readFileSync('components/yo/italian/guided/GuidedItalianCourse.tsx','utf8');
assert.match(source,/import Link from "..\/..\/learning\/LessonLink"/);
console.log('PASS 3 locale-preserving on-demand lesson links; new-tab and click controls retained; Italian player uses wrapper.');
