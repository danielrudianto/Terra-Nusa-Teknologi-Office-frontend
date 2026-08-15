/*
 * Lingkungan PRODUKSI.
 *
 * Memakai `https`, bukan `http`: token dan sandi melintas pada tiap
 * permintaan, dan tanpa enkripsi keduanya terbaca oleh siapa pun yang berada
 * di jaringan yang sama — termasuk di jaringan nirkabel kantor.
 */
export const environment = {
    url: "https://services.terrabot.alphakonstruksi.id/"
};
