import { db } from "./firebase-core.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";


// ======================================
// PLACEHOLDER IMAGE
// ======================================

const PLACEHOLDER =
  "assets/images/placeholder.svg";


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
// BUILD MEDIA ROW
// ======================================

function row(item) {

  const playerId =
    "p-" +
    String(item.id)
      .replace(
        /[^a-z0-9]/gi,
        "-"
      );


  const cover =
    item.coverUrl ||
    item.previewUrl ||
    PLACEHOLDER;


  return `
    <article class="song-row">

      <img
        class="song-cover"
        src="${esc(cover)}"
        alt="${esc(item.title || "Media")}"
      >


      <div class="song-meta">

        <h3>
          ${esc(item.title || "Untitled")}
        </h3>

        <p>
          ${esc(item.description || "")}
        </p>


        <div
          id="${playerId}"
          class="player-box"
        >

          ${
            item.fileUrl
              ? `
                <audio
                  controls
                  preload="none"
                  src="${esc(item.fileUrl)}"
                ></audio>
              `
              : `
                <div class="notice">
                  Media file is unavailable.
                </div>
              `
          }

        </div>

      </div>


      <div class="song-actions">

        <button
          class="btn"
          data-play="${playerId}"
        >
          ▶ Play
        </button>


        <button
          class="btn black"
          data-download="${esc(item.fileUrl || "")}"
          data-title="${esc(item.title || "audio")}"
        >
          ⬇ Download
        </button>


        <button
          class="btn yellow"
          data-share="${esc(item.id)}"
          data-type="${esc(item.type)}"
          data-sharetitle="${esc(item.title || "")}"
        >
          ↗ Share
        </button>

      </div>

    </article>
  `;

}


// ======================================
// ACTIONS
// ======================================

function wireActions() {

  // PLAY
  document
    .querySelectorAll(
      "[data-play]"
    )
    .forEach(button => {

      button.onclick = () => {

        const target =
          document.getElementById(
            button.dataset.play
          );


        document
          .querySelectorAll(
            ".player-box.open"
          )
          .forEach(box => {

            if (box !== target) {

              box.classList.remove(
                "open"
              );

              box
                .querySelector("audio")
                ?.pause();

            }

          });


        target?.classList.toggle(
          "open"
        );

      };

    });


  // DOWNLOAD
  document
    .querySelectorAll(
      "[data-download]"
    )
    .forEach(button => {

      button.onclick =
        () => {

          const url =
            button.dataset.download;


          if (!url) {

            alert(
              "File is not available."
            );

            return;
          }


          /*
           * Open/download Cloudinary file.
           */

          const link =
            document.createElement(
              "a"
            );


          link.href =
            url;


          link.download =
            button.dataset.title ||
            "audio";


          link.target =
            "_blank";


          document.body.appendChild(
            link
          );


          link.click();


          link.remove();

        };

    });


  // SHARE
  document
    .querySelectorAll(
      "[data-share]"
    )
    .forEach(button => {

      button.onclick =
        async () => {

          const base =
            location.origin +
            location.pathname.replace(
              /[^/]+$/,
              ""
            );


          const url =
            `${base}item.html?id=${
              encodeURIComponent(
                button.dataset.share
              )
            }&type=${
              encodeURIComponent(
                button.dataset.type
              )
            }`;


          if (
            navigator.share
          ) {

            try {

              await navigator.share({

                title:
                  button.dataset
                    .sharetitle,

                url:
                  url

              });

            } catch (error) {

              console.log(
                "Share cancelled.",
                error
              );

            }

          } else {

            try {

              await navigator
                .clipboard
                .writeText(url);


              alert(
                "Share link copied."
              );


            } catch {

              prompt(
                "Copy this link:",
                url
              );

            }

          }

        };

    });

}


// ======================================
// FETCH FIRESTORE MEDIA
// ======================================

async function fetchMedia(type) {

  try {

    /*
     * IMPORTANT:
     *
     * We filter only.
     *
     * We DO NOT use orderBy()
     * here because that can require
     * a Firestore composite index.
     */

    const mediaQuery =
      query(

        collection(
          db,
          "media"
        ),

        where(
          "type",
          "==",
          type
        ),

        where(
          "published",
          "==",
          true
        )

      );


    const snapshot =
      await getDocs(
        mediaQuery
      );


    const items =
      snapshot.docs.map(
        documentSnapshot => ({

          id:
            documentSnapshot.id,

          ...documentSnapshot.data()

        })
      );


    /*
     * Sort locally.
     *
     * Latest uploads first.
     */

    items.sort(
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


    return items;


  } catch (error) {

    console.error(
      "Media loading error:",
      error
    );


    return [];

  }

}


// ======================================
// LOAD MEDIA LIST
// ======================================

async function load(
  type,
  listId,
  searchId
) {

  const list =
    document.getElementById(
      listId
    );


  if (!list) {
    return;
  }


  list.innerHTML = `
    <div class="card">
      Loading...
    </div>
  `;


  const rows =
    await fetchMedia(type);


  // ====================================
  // DRAW
  // ====================================

  const draw =
    data => {


      if (!data.length) {

        list.innerHTML = `
          <div class="card">

            <p>
              No ${
                type === "song"
                  ? "songs"
                  : "audios"
              } available yet.
            </p>

          </div>
        `;

        return;

      }


      list.innerHTML =
        data
          .map(row)
          .join("");


      wireActions();

    };


  draw(rows);


  // ====================================
  // SEARCH
  // ====================================

  document
    .getElementById(
      searchId
    )
    ?.addEventListener(
      "input",
      event => {

        const search =
          event.target.value
            .toLowerCase()
            .trim();


        const filtered =
          rows.filter(
            item => {

              const text =
                (
                  (item.title || "") +
                  " " +
                  (item.description || "")
                )
                  .toLowerCase();


              return text.includes(
                search
              );

            }
          );


        draw(filtered);

      }
    );

}


// ======================================
// START
// ======================================

// Home page songs
load(
  "song",
  "homeSongsList",
  "homeSongSearch"
);


// Songs page
load(
  "song",
  "songsList",
  "songSearch"
);


// Audios page
load(
  "audio",
  "audiosList",
  "audioSearch"
);