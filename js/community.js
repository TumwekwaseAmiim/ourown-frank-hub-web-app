import { db } from "./firebase-core.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";


// ======================================
// CLOUDINARY SETTINGS
// ======================================

const CLOUDINARY_CLOUD_NAME = "qlxhf4mv";
const CLOUDINARY_UPLOAD_PRESET = "ourown_hub_unsigned";


// ======================================
// HELPERS
// ======================================

function esc(value) {
  return String(value ?? "").replace(
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


function getInitials(name) {
  const text = String(name || "Guest").trim();
  const parts = text.split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .substring(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}


function formatPostTime(timestamp) {

  if (!timestamp?.toDate) {
    return "";
  }

  const date = timestamp.toDate();

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}


// ======================================
// CLOUDINARY UPLOAD
// ======================================

async function uploadToCloudinary(file) {

  const isAudio =
    file.type.startsWith("audio/");


  /*
   * Cloudinary handles audio
   * through the video resource type.
   */

  const resourceType =
    isAudio
      ? "video"
      : "image";


  const endpoint =
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;


  const formData =
    new FormData();


  formData.append(
    "file",
    file
  );


  formData.append(
    "upload_preset",
    CLOUDINARY_UPLOAD_PRESET
  );


  const response =
    await fetch(
      endpoint,
      {
        method: "POST",
        body: formData
      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    console.error(
      "Cloudinary error:",
      data
    );

    throw new Error(
      data?.error?.message ||
      "Cloudinary upload failed."
    );

  }


  return {

    url:
      data.secure_url,

    publicId:
      data.public_id,

    resourceType:
      resourceType

  };

}


// ======================================
// BUILD COMMUNITY POST
// ======================================

function card(post) {

  const name =
    post.posterName ||
    "Guest";


  const time =
    formatPostTime(
      post.createdAt
    );


  let media = "";


  // ====================================
  // AUDIO
  // ====================================

  if (
    post.mediaUrl &&
    String(
      post.mediaType || ""
    ).startsWith("audio")
  ) {

    media = `
      <div class="feed-audio-box">

        <div class="feed-audio-icon">
          ♪
        </div>

        <div class="feed-audio-content">

          <div class="feed-audio-label">
            Audio
          </div>

          <audio
            controls
            preload="metadata"
            src="${esc(post.mediaUrl)}"
          ></audio>

        </div>

      </div>
    `;

  }


  // ====================================
  // PHOTO
  // ====================================

  else if (post.mediaUrl) {

    media = `
      <div class="feed-photo">

        <img
          src="${esc(post.mediaUrl)}"
          alt="Community post"
          loading="lazy"
        >

      </div>
    `;

  }


  return `
    <article class="feed-post">

      <div class="feed-post-header">

        <div class="feed-avatar">

          ${esc(
            getInitials(name)
          )}

        </div>


        <div class="feed-post-user">

          <strong>
            ${esc(name)}
          </strong>

          ${
            time
              ? `
                <small>
                  ${esc(time)}
                </small>
              `
              : ""
          }

        </div>

      </div>


      ${
        post.caption
          ? `
            <div class="feed-caption">
              ${esc(post.caption)}
            </div>
          `
          : ""
      }


      ${media}

    </article>
  `;

}


// ======================================
// LOAD COMMUNITY FEED
// ======================================

async function loadFeed() {

  const box =
    document.getElementById(
      "communityFeed"
    );


  if (!box) {
    return;
  }


  box.innerHTML = `
    <div class="card">
      Loading community posts...
    </div>
  `;


  try {

    /*
     * Filter active posts in Firestore.
     *
     * Sorting is done locally
     * to avoid needing a
     * composite Firestore index.
     */

    const q =
      query(

        collection(
          db,
          "communityPosts"
        ),

        where(
          "status",
          "==",
          "active"
        )

      );


    const snap =
      await getDocs(q);


    const posts =
      snap.docs.map(
        documentSnapshot => ({

          id:
            documentSnapshot.id,

          ...documentSnapshot.data()

        })
      );


    // Newest first

    posts.sort(
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


    if (!posts.length) {

      box.innerHTML = `
        <div class="card">

          <p>
            No community posts yet.
          </p>

        </div>
      `;

      return;
    }


    box.innerHTML =
      posts
        .map(card)
        .join("");


  } catch (error) {

    console.error(
      "Community feed error:",
      error
    );


    box.innerHTML = `
      <div class="card">

        <p>
          Could not load community posts.
        </p>

      </div>
    `;

  }

}


// ======================================
// CREATE COMMUNITY POST
// ======================================

document
  .getElementById("communityForm")
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const status =
        document.getElementById(
          "postStatus"
        );


      const submitButton =
        event.target.querySelector(
          'button[type="submit"]'
        );


      const name =
        document
          .getElementById("posterName")
          ?.value
          .trim()
        || "Guest";


      const caption =
        document
          .getElementById("postCaption")
          ?.value
          .trim()
        || "";


      const mediaInput =
        document.getElementById(
          "postMedia"
        );


      const media =
        mediaInput
          ?.files
          ?.[0];


      // ==================================
      // REQUIRE TEXT OR MEDIA
      // ==================================

      if (
        !caption &&
        !media
      ) {

        status.innerHTML = `
          <div class="notice">

            Write something or choose
            a photo/audio file before posting.

          </div>
        `;

        return;

      }


      // ==================================
      // FILE TYPE VALIDATION
      // ==================================

      if (
        media &&
        !media.type.startsWith("image/") &&
        !media.type.startsWith("audio/")
      ) {

        status.innerHTML = `
          <div class="notice">

            Please choose a photo
            or audio file only.

          </div>
        `;

        return;

      }


      try {

        submitButton.disabled = true;


        let mediaUrl = "";
        let mediaType = "";
        let cloudinaryPublicId = "";


        // ==================================
        // UPLOAD MEDIA
        // ==================================

        if (media) {

          const label =
            media.type.startsWith(
              "image/"
            )
              ? "photo"
              : "audio";


          status.innerHTML = `
            <div class="notice">

              Uploading ${label}...

            </div>
          `;


          const uploadResult =
            await uploadToCloudinary(
              media
            );


          mediaUrl =
            uploadResult.url;


          mediaType =
            media.type;


          cloudinaryPublicId =
            uploadResult.publicId;

        }


        status.innerHTML = `
          <div class="notice">

            Saving post...

          </div>
        `;


        // ==================================
        // SAVE TO FIRESTORE
        // ==================================

        await addDoc(

          collection(
            db,
            "communityPosts"
          ),

          {

            posterName:
              name,

            caption:
              caption,

            mediaType:
              mediaType,

            mediaUrl:
              mediaUrl,

            cloudinaryPublicId:
              cloudinaryPublicId,

            status:
              "active",

            createdAt:
              serverTimestamp()

          }

        );


        status.innerHTML = `
          <div class="notice">

            <strong>
              Posted successfully.
            </strong>

          </div>
        `;


        event.target.reset();


        await loadFeed();


      } catch (error) {

        console.error(
          "Post error:",
          error
        );


        status.innerHTML = `
          <div class="notice">

            <strong>
              Could not post.
            </strong>

            <br>

            ${esc(
              error.message ||
              "Please try again."
            )}

          </div>
        `;

      } finally {

        submitButton.disabled = false;

      }

    }
  );


// ======================================
// FILE SELECTION MESSAGE
// ======================================

document
  .getElementById("postMedia")
  ?.addEventListener(
    "change",
    event => {

      const file =
        event.target
          .files
          ?.[0];


      const status =
        document.getElementById(
          "postStatus"
        );


      if (!file) {

        status.innerHTML = "";

        return;

      }


      let label =
        "File";


      if (
        file.type.startsWith(
          "image/"
        )
      ) {

        label =
          "Photo";

      }


      if (
        file.type.startsWith(
          "audio/"
        )
      ) {

        label =
          "Audio";

      }


      status.innerHTML = `
        <div class="notice">

          <strong>
            ${label} selected:
          </strong>

          ${esc(file.name)}

        </div>
      `;

    }
  );


// ======================================
// START
// ======================================

loadFeed();