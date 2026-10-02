import { db } from "./firebase-core.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";


// ======================================
// SETTINGS
// ======================================

const PLACEHOLDER =
  "assets/images/placeholder.svg";

let allPhotos = [];


// ======================================
// HELPERS
// ======================================

function esc(value) {

  return String(value ?? "")
    .replace(
      /[&<>"']/g,
      char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char])
    );

}


// ======================================
// GET PHOTO URL
// ======================================

function getPhotoUrl(photo) {

  return (
    photo.previewUrl ||
    photo.fileUrl ||
    photo.coverUrl ||
    PLACEHOLDER
  );

}


// ======================================
// DOWNLOAD PHOTO
// ======================================

async function downloadPhoto(
  url,
  title
) {

  if (!url) {
    alert("Photo is not available.");
    return;
  }


  try {

    /*
     * Fetch the image as a Blob.
     * This helps force an actual
     * download instead of simply
     * opening the image.
     */

    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        "Could not download photo."
      );

    }


    const blob =
      await response.blob();


    const blobUrl =
      URL.createObjectURL(blob);


    const link =
      document.createElement("a");


    link.href =
      blobUrl;


    link.download =
      cleanFilename(
        title || "photo"
      );


    document.body.appendChild(
      link
    );


    link.click();


    link.remove();


    setTimeout(
      () => {
        URL.revokeObjectURL(
          blobUrl
        );
      },
      1000
    );


  } catch (error) {

    console.error(
      "Photo download error:",
      error
    );


    /*
     * Fallback:
     * open the Cloudinary image
     * in a new tab.
     */

    window.open(
      url,
      "_blank",
      "noopener"
    );

  }

}


// ======================================
// CLEAN DOWNLOAD FILE NAME
// ======================================

function cleanFilename(title) {

  const clean =
    String(title || "photo")
      .trim()
      .replace(
        /[<>:"/\\|?*]+/g,
        "-"
      )
      .replace(
        /\s+/g,
        "-"
      );


  return clean || "photo";

}


// ======================================
// SHARE PHOTO
// ======================================

async function sharePhoto(
  photo
) {

  const url =
    getPhotoUrl(photo);


  const title =
    photo.title ||
    "OurOwn Hub Photo";


  const text =
    photo.description ||
    "Photo from OurOwn Hub";


  if (
    navigator.share
  ) {

    try {

      await navigator.share({
        title,
        text,
        url
      });


      return;


    } catch (error) {

      /*
       * User may simply cancel.
       */

      console.log(
        "Share cancelled:",
        error
      );

      return;

    }

  }


  try {

    await navigator
      .clipboard
      .writeText(url);


    alert(
      "Photo link copied."
    );


  } catch (error) {

    console.error(
      "Clipboard error:",
      error
    );


    prompt(
      "Copy this photo link:",
      url
    );

  }

}


// ======================================
// DRAW PHOTOS
// ======================================

function draw(rows) {

  const grid =
    document.getElementById(
      "photosGrid"
    );


  if (!grid) {
    return;
  }


  if (!rows.length) {

    grid.innerHTML = `
      <div class="card">

        <p>
          No photos available yet.
        </p>

      </div>
    `;

    return;

  }


  grid.innerHTML =
    rows
      .map(photo => {

        const photoUrl =
          getPhotoUrl(photo);


        return `
          <article class="card photo-card">

            <img
              src="${esc(photoUrl)}"
              alt="${esc(
                photo.title ||
                "Photo"
              )}"
              loading="lazy"
            >


            <h3>
              ${esc(
                photo.title ||
                "Untitled Photo"
              )}
            </h3>


            ${
              photo.description
                ? `
                  <p>
                    ${esc(
                      photo.description
                    )}
                  </p>
                `
                : ""
            }


            <div class="media-actions">

              <button
                class="btn"
                data-view="${esc(
                  photo.id
                )}"
              >
                👁 View
              </button>


              <button
                class="btn black"
                data-download="${esc(
                  photo.id
                )}"
              >
                ⬇ Download
              </button>


              <button
                class="btn yellow"
                data-share="${esc(
                  photo.id
                )}"
              >
                ↗ Share
              </button>

            </div>

          </article>
        `;

      })
      .join("");


  wireActions();

}


// ======================================
// PHOTO ACTIONS
// ======================================

function wireActions() {

  // ====================================
  // VIEW
  // ====================================

  document
    .querySelectorAll(
      "[data-view]"
    )
    .forEach(button => {

      button.onclick =
        () => {

          const photo =
            allPhotos.find(
              item =>
                item.id ===
                button.dataset.view
            );


          if (!photo) {
            return;
          }


          const url =
            getPhotoUrl(photo);


          window.open(
            url,
            "_blank",
            "noopener"
          );

        };

    });


  // ====================================
  // DOWNLOAD
  // ====================================

  document
    .querySelectorAll(
      "[data-download]"
    )
    .forEach(button => {

      button.onclick =
        async () => {

          const photo =
            allPhotos.find(
              item =>
                item.id ===
                button.dataset.download
            );


          if (!photo) {

            alert(
              "Photo could not be found."
            );

            return;
          }


          await downloadPhoto(
            getPhotoUrl(photo),
            photo.title
          );

        };

    });


  // ====================================
  // SHARE
  // ====================================

  document
    .querySelectorAll(
      "[data-share]"
    )
    .forEach(button => {

      button.onclick =
        async () => {

          const photo =
            allPhotos.find(
              item =>
                item.id ===
                button.dataset.share
            );


          if (!photo) {

            alert(
              "Photo could not be found."
            );

            return;
          }


          await sharePhoto(
            photo
          );

        };

    });

}


// ======================================
// LOAD PHOTOS
// ======================================

async function load() {

  const grid =
    document.getElementById(
      "photosGrid"
    );


  if (!grid) {
    return;
  }


  grid.innerHTML = `
    <div class="card">
      Loading photos...
    </div>
  `;


  try {

    /*
     * Only fetch published photos.
     *
     * No Firestore orderBy().
     * We sort locally instead.
     */

    const photoQuery =
      query(

        collection(
          db,
          "media"
        ),

        where(
          "type",
          "==",
          "photo"
        ),

        where(
          "published",
          "==",
          true
        )

      );


    const snapshot =
      await getDocs(
        photoQuery
      );


    allPhotos =
      snapshot.docs.map(
        documentSnapshot => ({

          id:
            documentSnapshot.id,

          ...documentSnapshot.data()

        })
      );


    // ====================================
    // NEWEST FIRST
    // ====================================

    allPhotos.sort(
      (a, b) => {

        const timeA =
          a.createdAt
            ?.toMillis?.() || 0;


        const timeB =
          b.createdAt
            ?.toMillis?.() || 0;


        return timeB - timeA;

      }
    );


    draw(
      allPhotos
    );


  } catch (error) {

    console.error(
      "Photo loading error:",
      error
    );


    grid.innerHTML = `
      <div class="card">

        <p>
          Could not load photos.
        </p>

      </div>
    `;

  }

}


// ======================================
// SEARCH
// ======================================

document
  .getElementById(
    "photoSearch"
  )
  ?.addEventListener(
    "input",
    event => {

      const search =
        event.target.value
          .toLowerCase()
          .trim();


      if (!search) {

        draw(
          allPhotos
        );

        return;

      }


      const filtered =
        allPhotos.filter(
          photo => {

            const text =
              (
                (photo.title || "") +
                " " +
                (photo.description || "")
              )
                .toLowerCase();


            return text.includes(
              search
            );

          }
        );


      draw(
        filtered
      );

    }
  );


// ======================================
// START
// ======================================

load();