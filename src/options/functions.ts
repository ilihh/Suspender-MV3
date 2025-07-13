export function clone(source: HTMLTemplateElement): HTMLElement
{
	return (source.content.cloneNode(true) as DocumentFragment).firstElementChild as HTMLElement;
}