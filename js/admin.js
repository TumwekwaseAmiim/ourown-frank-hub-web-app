import {
  auth,
  db
} from "./firebase-core.js";


import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";


import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";


// ======================================
// CLOUDINARY SETTINGS
// ======================================

const CLOUDINARY_CLOUD_NAME =
  "qlxhf4mv";

const CLOUDINARY_UPLOAD_PRESET =
  "ourown_hub_unsigned";


// ======================================
// CURRENT PAGE
// ======================================

const page =
  location.pathname
    .split("/")
    .pop();


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
// ADMIN CHECK
// ======================================

async function isAdminUser(user) {

  if (!user) {
    return false;
  }


  const snapshot =
    await getDoc(

      doc(
        db,
        "users",
        user.uid
      )

    );


  return (
    snapshot.exists() &&
    snapshot.data().role === "admin"
  );

}


// ======================================
// REQUIRE ADMIN
// ======================================

async function requireAdmin() {

  return new Promise(resolve => {

    onAuthStateChanged(
      auth,
      async user => {

        if (!user) {

          if (
            page !==
            "login.html"
          ) {

            location.href =
              "login.html";

          }


          resolve(null);

          return;

        }


        const admin =
          await isAdminUser(user);


        if (!admin) {

          await signOut(auth);


          if (
            page !==
            "login.html"
          ) {

            location.href =
              "login.html";

          }


          resolve(null);

          return;

        }


        resolve(user);

      }
    );

  });

}


// ======================================
// CLOUDINARY UPLOAD
// ======================================

async function uploadToCloudinary(
  file
) {

  const isImage =
    file.type.startsWith(
      "image/"
    );


  /*
   * Cloudinary handles:
   *
   * images -> image
   * songs/audio -> video
   */

  const resourceType =
    isImage
      ? "image"
      : "video";


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
      resourceType,

    format:
      data.format || ""

  };

}


// ======================================
// ADMIN LOGIN
// ======================================

document
  .getElementById(
    "adminLoginForm"
  )
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const status =
        document.getElementById(
          "adminLoginStatus"
        );


      try {

        status.textContent =
          "Signing in...";


        const credential =
          await signInWithEmailAndPassword(

            auth,

            document
              .getElementById(
                "adminEmail"
              )
              .value
              .trim(),

            document
              .getElementById(
                "adminPassword"
              )
              .value

          );


        const admin =
          await isAdminUser(
            credential.user
          );


        if (!admin) {

          await signOut(auth);


          status.textContent =
            "This account is not an admin.";


          return;

        }


        location.href =
          "dashboard.html";


      } catch (error) {

        console.error(
          "Admin login error:",
          error
        );


        if (
          error.code ===
          "auth/invalid-credential"
        ) {

          status.textContent =
            "Incorrect email or password.";

        } else {

          status.textContent =
            error.message;

        }

      }

    }
  );


// ======================================
// ADMIN LOGOUT
// ======================================

document
  .getElementById(
    "adminLogout"
  )
  ?.addEventListener(
    "click",
    async () => {

      await signOut(auth);

      location.href =
        "login.html";

    }
  );


// ======================================
// DASHBOARD
// ======================================

if (
  page ===
  "dashboard.html"
) {

  const user =
    await requireAdmin();


  if (user) {

    try {

      const [
        mediaSnapshot,
        postSnapshot,
        userSnapshot
      ] =
        await Promise.all([

          getDocs(
            collection(
              db,
              "media"
            )
          ),

          getDocs(
            collection(
              db,
              "communityPosts"
            )
          ),

          getDocs(
            collection(
              db,
              "users"
            )
          )

        ]);


      const media =
        mediaSnapshot.docs.map(
          item =>
            item.data()
        );


      const statSongs =
        document.getElementById(
          "statSongs"
        );


      const statAudios =
        document.getElementById(
          "statAudios"
        );


      const statPhotos =
        document.getElementById(
          "statPhotos"
        );


      const statPosts =
        document.getElementById(
          "statPosts"
        );


      const statUsers =
        document.getElementById(
          "statUsers"
        );


      /*
       * Older dashboard may still
       * contain statRequests.
       *
       * Set it to zero until we
       * remove the old card.
       */

      const statRequests =
        document.getElementById(
          "statRequests"
        );


      if (statSongs) {

        statSongs.textContent =
          media.filter(
            item =>
              item.type ===
              "song"
          ).length;

      }


      if (statAudios) {

        statAudios.textContent =
          media.filter(
            item =>
              item.type ===
              "audio"
          ).length;

      }


      if (statPhotos) {

        statPhotos.textContent =
          media.filter(
            item =>
              item.type ===
              "photo"
          ).length;

      }


      if (statPosts) {

        statPosts.textContent =
          postSnapshot.size;

      }


      if (statUsers) {

        statUsers.textContent =
          userSnapshot.size;

      }


      if (statRequests) {

        statRequests.textContent =
          "0";

      }


    } catch (error) {

      console.error(
        "Dashboard error:",
        error
      );

    }

  }

}


// ======================================
// UPLOAD MEDIA
// ======================================

if (
  page ===
  "upload.html"
) {

  const user =
    await requireAdmin();


  if (user) {

    document
      .getElementById(
        "adminUploadForm"
      )
      ?.addEventListener(
        "submit",
        async event => {

          event.preventDefault();


          const status =
            document.getElementById(
              "uploadStatus"
            );


          const button =
            document.getElementById(
              "adminUploadButton"
            );


          const type =
            document
              .getElementById(
                "mediaType"
              )
              .value;


          const title =
            document
              .getElementById(
                "mediaTitle"
              )
              .value
              .trim();


          const description =
            document
              .getElementById(
                "mediaDescription"
              )
              .value
              .trim();


          const file =
            document
              .getElementById(
                "mediaFile"
              )
              .files
              ?.[0];


          const cover =
            document
              .getElementById(
                "mediaCover"
              )
              ?.files
              ?.[0];


          const published =
            document
              .getElementById(
                "mediaPublished"
              )
              .checked;


          // ==================================
          // BASIC VALIDATION
          // ==================================

          if (!title) {

            status.innerHTML = `
              <div class="notice">
                Please enter a title.
              </div>
            `;

            return;

          }


          if (!file) {

            status.innerHTML = `
              <div class="notice">
                Please choose a file.
              </div>
            `;

            return;

          }


          // ==================================
          // SONG / AUDIO VALIDATION
          // ==================================

          if (
            (
              type === "song" ||
              type === "audio"
            ) &&
            !file.type.startsWith(
              "audio/"
            )
          ) {

            status.innerHTML = `
              <div class="notice">
                Please choose an audio file.
              </div>
            `;

            return;

          }


          // ==================================
          // PHOTO VALIDATION
          // ==================================

          if (
            type === "photo" &&
            !file.type.startsWith(
              "image/"
            )
          ) {

            status.innerHTML = `
              <div class="notice">
                Please choose a photo.
              </div>
            `;

            return;

          }


          // ==================================
          // COVER VALIDATION
          // ==================================

          if (
            cover &&
            !cover.type.startsWith(
              "image/"
            )
          ) {

            status.innerHTML = `
              <div class="notice">
                Cover must be an image.
              </div>
            `;

            return;

          }


          try {

            button.disabled =
              true;


            // ==================================
            // MAIN FILE UPLOAD
            // ==================================

            status.innerHTML = `
              <div class="notice">
                Uploading ${
                  type === "photo"
                    ? "photo"
                    : type
                }...
              </div>
            `;


            const mainUpload =
              await uploadToCloudinary(
                file
              );


            let coverUrl =
              "";

            let coverPublicId =
              "";


            // ==================================
            // OPTIONAL COVER
            // ==================================

            if (
              (
                type === "song" ||
                type === "audio"
              ) &&
              cover
            ) {

              status.innerHTML = `
                <div class="notice">
                  Uploading cover image...
                </div>
              `;


              const coverUpload =
                await uploadToCloudinary(
                  cover
                );


              coverUrl =
                coverUpload.url;


              coverPublicId =
                coverUpload.publicId;

            }


            // ==================================
            // PHOTO URL
            // ==================================

            /*
             * For photos:
             *
             * fileUrl = download/view URL
             * previewUrl = same photo URL
             *
             * Everything is public and
             * directly downloadable.
             */

            const previewUrl =
              type === "photo"
                ? mainUpload.url
                : "";


            // ==================================
            // SAVE FIRESTORE RECORD
            // ==================================

            status.innerHTML = `
              <div class="notice">
                Saving media details...
              </div>
            `;


            await addDoc(

              collection(
                db,
                "media"
              ),

              {

                title:
                  title,

                description:
                  description,

                type:
                  type,

                fileUrl:
                  mainUpload.url,

                coverUrl:
                  coverUrl,

                previewUrl:
                  previewUrl,

                cloudinaryPublicId:
                  mainUpload.publicId,

                coverPublicId:
                  coverPublicId,

                cloudinaryResourceType:
                  mainUpload.resourceType,

                fileFormat:
                  mainUpload.format,

                published:
                  published,

                createdAt:
                  serverTimestamp(),

                plays:
                  0,

                downloads:
                  0

              }

            );


            // ==================================
            // SUCCESS
            // ==================================

            status.innerHTML = `
              <div class="notice">

                <strong>
                  Upload complete.
                </strong>

                <br>

                ${esc(title)}

              </div>
            `;


            event.target.reset();


            const publishCheckbox =
              document.getElementById(
                "mediaPublished"
              );


            if (publishCheckbox) {

              publishCheckbox.checked =
                true;

            }


            /*
             * Return form to Song mode
             * after reset.
             */

            const mediaType =
              document.getElementById(
                "mediaType"
              );


            if (mediaType) {

              mediaType.value =
                "song";


              mediaType.dispatchEvent(
                new Event(
                  "change"
                )
              );

            }


          } catch (error) {

            console.error(
              "Admin upload error:",
              error
            );


            status.innerHTML = `
              <div class="notice">

                <strong>
                  Upload failed.
                </strong>

                <br>

                ${esc(
                  error.message ||
                  "Please try again."
                )}

              </div>
            `;


          } finally {

            button.disabled =
              false;

          }

        }
      );

  }

}


// ======================================
// COMMUNITY MODERATION
// ======================================

if (
  page ===
  "community.html"
) {

  const user =
    await requireAdmin();


  if (user) {

    try {

      const snapshot =
        await getDocs(

          query(

            collection(
              db,
              "communityPosts"
            ),

            orderBy(
              "createdAt",
              "desc"
            )

          )

        );


      const container =
        document.getElementById(
          "adminCommunity"
        );


      if (!container) {

        console.warn(
          "adminCommunity container not found."
        );

      } else if (
        snapshot.empty
      ) {

        container.innerHTML = `
          <div class="card">

            <p>
              No community posts yet.
            </p>

          </div>
        `;

      } else {

        container.innerHTML =
          snapshot.docs
            .map(item => {

              const post =
                item.data();


              let media =
                "";


              // PHOTO

              if (
                post.mediaUrl &&
                String(
                  post.mediaType ||
                  ""
                ).startsWith(
                  "image"
                )
              ) {

                media = `
                  <img
                    src="${esc(
                      post.mediaUrl
                    )}"
                    alt="Community post"
                    style="
                      width:100%;
                      max-height:300px;
                      object-fit:contain;
                      margin-top:10px;
                      border-radius:10px;
                    "
                  >
                `;

              }


              // AUDIO

              if (
                post.mediaUrl &&
                String(
                  post.mediaType ||
                  ""
                ).startsWith(
                  "audio"
                )
              ) {

                media = `
                  <audio
                    controls
                    preload="metadata"
                    src="${esc(
                      post.mediaUrl
                    )}"
                    style="
                      width:100%;
                      margin-top:10px;
                    "
                  ></audio>
                `;

              }


              return `
                <div class="card">

                  <span class="badge">
                    ${esc(
                      post.status ||
                      "active"
                    )}
                  </span>

                  <h3>
                    ${esc(
                      post.posterName ||
                      "Guest"
                    )}
                  </h3>

                  ${
                    post.caption
                      ? `
                        <p>
                          ${esc(
                            post.caption
                          )}
                        </p>
                      `
                      : ""
                  }

                  ${media}

                  <div class="media-actions">

                    ${
                      post.status ===
                      "active"
                        ? `
                          <button
                            class="btn danger"
                            data-hide="${item.id}"
                          >
                            Hide
                          </button>
                        `
                        : `
                          <button
                            class="btn"
                            data-show="${item.id}"
                          >
                            Show
                          </button>
                        `
                    }

                    <button
                      class="btn black"
                      data-delete="${item.id}"
                    >
                      Delete
                    </button>

                  </div>

                </div>
              `;

            })
            .join("");

      }


      // ==================================
      // HIDE POST
      // ==================================

      document
        .querySelectorAll(
          "[data-hide]"
        )
        .forEach(button => {

          button.onclick =
            async () => {

              await updateDoc(

                doc(
                  db,
                  "communityPosts",
                  button.dataset.hide
                ),

                {
                  status:
                    "hidden"
                }

              );


              location.reload();

            };

        });


      // ==================================
      // SHOW POST
      // ==================================

      document
        .querySelectorAll(
          "[data-show]"
        )
        .forEach(button => {

          button.onclick =
            async () => {

              await updateDoc(

                doc(
                  db,
                  "communityPosts",
                  button.dataset.show
                ),

                {
                  status:
                    "active"
                }

              );


              location.reload();

            };

        });


      // ==================================
      // DELETE POST
      // ==================================

      document
        .querySelectorAll(
          "[data-delete]"
        )
        .forEach(button => {

          button.onclick =
            async () => {

              const confirmed =
                confirm(
                  "Delete this community post?"
                );


              if (!confirmed) {
                return;
              }


              await deleteDoc(

                doc(
                  db,
                  "communityPosts",
                  button.dataset.delete
                )

              );


              location.reload();

            };

        });


    } catch (error) {

      console.error(
        "Community moderation error:",
        error
      );

    }

  }

}


// ======================================
// CHAT USER MANAGEMENT
// ======================================

if (
  page ===
  "chat.html"
) {

  const user =
    await requireAdmin();


  if (user) {

    try {

      const snapshot =
        await getDocs(

          collection(
            db,
            "users"
          )

        );


      const container =
        document.getElementById(
          "adminChatUsers"
        );


      if (!container) {

        console.warn(
          "adminChatUsers container not found."
        );

      } else {

        const users =
          snapshot.docs
            .map(item => ({

              id:
                item.id,

              ...item.data()

            }))
            .sort(
              (a, b) =>
                String(
                  a.displayName || ""
                )
                  .localeCompare(
                    String(
                      b.displayName || ""
                    )
                  )
            );


        container.innerHTML =
          users
            .map(account => {

              return `
                <div class="card">

                  <strong>
                    ${esc(
                      account.displayName ||
                      account.id
                    )}
                  </strong>

                  <p>

                    ${esc(
                      account.email ||
                      ""
                    )}

                    ${
                      account.email
                        ? "<br>"
                        : ""
                    }

                    Status:
                    <strong>
                      ${esc(
                        account.status ||
                        "active"
                      )}
                    </strong>

                    <br>

                    Role:
                    ${esc(
                      account.role ||
                      "user"
                    )}

                  </p>


                  ${
                    account.role ===
                    "admin"
                      ? `
                        <span class="badge">
                          Admin
                        </span>
                      `
                      : `
                        <div class="media-actions">

                          ${
                            account.status ===
                            "suspended"
                              ? `
                                <button
                                  class="btn"
                                  data-activate="${account.id}"
                                >
                                  Activate
                                </button>
                              `
                              : `
                                <button
                                  class="btn danger"
                                  data-suspend="${account.id}"
                                >
                                  Suspend
                                </button>
                              `
                          }

                        </div>
                      `
                  }

                </div>
              `;

            })
            .join("");

      }


      // ==================================
      // SUSPEND
      // ==================================

      document
        .querySelectorAll(
          "[data-suspend]"
        )
        .forEach(button => {

          button.onclick =
            async () => {

              const confirmed =
                confirm(
                  "Suspend this user?"
                );


              if (!confirmed) {
                return;
              }


              await updateDoc(

                doc(
                  db,
                  "users",
                  button.dataset.suspend
                ),

                {
                  status:
                    "suspended"
                }

              );


              location.reload();

            };

        });


      // ==================================
      // ACTIVATE
      // ==================================

      document
        .querySelectorAll(
          "[data-activate]"
        )
        .forEach(button => {

          button.onclick =
            async () => {

              await updateDoc(

                doc(
                  db,
                  "users",
                  button.dataset.activate
                ),

                {
                  status:
                    "active"
                }

              );


              location.reload();

            };

        });


    } catch (error) {

      console.error(
        "Chat user management error:",
        error
      );

    }

  }

}


// ======================================
// SETTINGS / RESET
// ======================================

if (
  page ===
  "settings.html"
) {

  const adminUser =
    await requireAdmin();


  document
    .getElementById(
      "resetBtn"
    )
    ?.addEventListener(
      "click",
      async () => {

        const status =
          document.getElementById(
            "resetStatus"
          );


        const type =
          document.getElementById(
            "resetType"
          ).value;


        const phrase =
          document
            .getElementById(
              "resetPhrase"
            )
            .value
            .trim();


        const password =
          document
            .getElementById(
              "resetPassword"
            )
            .value;


        // ==================================
        // CONFIRMATION PHRASE
        // ==================================

        if (
          phrase !==
          "RESET OUR OWN HUB"
        ) {

          status.textContent =
            "Confirmation phrase is incorrect.";

          return;

        }


        if (!adminUser) {

          status.textContent =
            "Admin session is unavailable.";

          return;

        }


        try {

          // ==================================
          // REAUTHENTICATE
          // ==================================

          await reauthenticateWithCredential(

            adminUser,

            EmailAuthProvider.credential(
              adminUser.email,
              password
            )

          );


          const confirmed =
            confirm(
              `Reset ${type}? This cannot be undone.`
            );


          if (!confirmed) {
            return;
          }


          // ==================================
          // RESET STATISTICS
          // ==================================

          if (
            type ===
            "statistics"
          ) {

            const snapshot =
              await getDocs(

                collection(
                  db,
                  "media"
                )

              );


            const batch =
              writeBatch(db);


            snapshot.forEach(
              item => {

                batch.update(

                  item.ref,

                  {
                    plays:
                      0,

                    downloads:
                      0
                  }

                );

              }
            );


            await batch.commit();

          }


          // ==================================
          // FULL RESET
          // ==================================

          else if (
            type ===
            "full"
          ) {

            /*
             * Admin user accounts are NOT
             * deleted by a full reset.
             */

            const collections =
              [
                "chatMessages",
                "communityPosts",
                "media"
              ];


            for (
              const collectionName
              of collections
            ) {

              const snapshot =
                await getDocs(

                  collection(
                    db,
                    collectionName
                  )

                );


              const batch =
                writeBatch(db);


              snapshot.forEach(
                item => {

                  batch.delete(
                    item.ref
                  );

                }
              );


              await batch.commit();

            }

          }


          // ==================================
          // COMMUNITY RESET
          // ==================================

          else if (
            type ===
            "community"
          ) {

            await clearCollection(
              "communityPosts"
            );

          }


          // ==================================
          // CHAT RESET
          // ==================================

          else if (
            type ===
            "chatMessages"
          ) {

            await clearCollection(
              "chatMessages"
            );

          }


          // ==================================
          // MEDIA RESET
          // ==================================

          else if (
            type ===
            "media"
          ) {

            await clearCollection(
              "media"
            );

          }


          else {

            throw new Error(
              "Unknown reset option."
            );

          }


          status.textContent =
            "Reset completed.";


        } catch (error) {

          console.error(
            "Reset error:",
            error
          );


          if (
            error.code ===
            "auth/invalid-credential"
          ) {

            status.textContent =
              "Incorrect admin password.";

          } else {

            status.textContent =
              error.message;

          }

        }

      }
    );

}


// ======================================
// CLEAR FIRESTORE COLLECTION
// ======================================

async function clearCollection(
  collectionName
) {

  const snapshot =
    await getDocs(

      collection(
        db,
        collectionName
      )

    );


  /*
   * For this small app a single batch
   * is currently sufficient.
   */

  const batch =
    writeBatch(db);


  snapshot.forEach(
    item => {

      batch.delete(
        item.ref
      );

    }
  );


  await batch.commit();

}