function requireElementById(id: string): HTMLElement {
    let el = document.getElementById(id);
    if (!el) throw `no such element in document: #${id}`;
    return el;
}
