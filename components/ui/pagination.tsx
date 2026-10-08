import Link from 'next/link';
export function Pagination({page,total,href}:{page:number;total:number;href:(page:number)=>string}) {
 const pages=Math.max(1,Math.ceil(total/12));
 if(pages===1)return null;
 return <nav className="row" aria-label="Pagination">{page>1&&<Link className="button button--secondary" href={href(page-1)}>Previous page</Link>}<span className="caption muted">Page {page} of {pages}</span>{page<pages&&<Link className="button button--secondary" href={href(page+1)}>Next page</Link>}</nav>;
}
