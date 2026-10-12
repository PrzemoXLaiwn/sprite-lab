using System;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;

namespace SpriteLab
{
    /// <summary>
    /// SpriteLab API client for Unity
    /// Generate AI game assets directly in your game
    /// </summary>
    public static class SpriteLabAPI
    {
        private const string API_BASE_URL = "https://sprite-lab.com/api";
        private static string _apiKey;

        /// <summary>
        /// Initialize the API with your key
        /// </summary>
        public static void Initialize(string apiKey)
        {
            _apiKey = apiKey;
        }

        /// <summary>
        /// Generate a single sprite
        /// </summary>
        public static async Task<GenerateResult> GenerateAsync(GenerateOptions options)
        {
            if (string.IsNullOrEmpty(_apiKey))
            {
                return new GenerateResult { Success = false, Error = "API key not set. Call SpriteLabAPI.Initialize() first." };
            }

            try
            {
                var requestBody = JsonUtility.ToJson(new GenerateRequest
                {
                    prompt = options.Prompt,
                    categoryId = options.Category,
                    subcategoryId = options.Subcategory,
                    styleId = options.Style,
                    colorPaletteId = options.ColorPalette,
                    seed = options.Seed
                });

                using var request = new UnityWebRequest($"{API_BASE_URL}/generate", "POST");
                request.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(requestBody));
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                request.SetRequestHeader("Authorization", $"Bearer {_apiKey}");

                var operation = request.SendWebRequest();
                while (!operation.isDone)
                {
                    await Task.Yield();
                }

                if (request.result != UnityWebRequest.Result.Success)
                {
                    return new GenerateResult { Success = false, Error = request.error };
                }

                var response = JsonUtility.FromJson<GenerateResponse>(request.downloadHandler.text);

                // Download the image
                var imageRequest = UnityWebRequestTexture.GetTexture(response.imageUrl);
                var imageOperation = imageRequest.SendWebRequest();
                while (!imageOperation.isDone)
                {
                    await Task.Yield();
                }

                if (imageRequest.result != UnityWebRequest.Result.Success)
                {
                    return new GenerateResult { Success = false, Error = "Failed to download image" };
                }

                var texture = DownloadHandlerTexture.GetContent(imageRequest);
                var sprite = Sprite.Create(
                    texture,
                    new Rect(0, 0, texture.width, texture.height),
                    new Vector2(0.5f, 0.5f),
                    options.PixelsPerUnit
                );

                return new GenerateResult
                {
                    Success = true,
                    Sprite = sprite,
                    Texture = texture,
                    ImageUrl = response.imageUrl,
                    Seed = response.seed,
                    CreditsUsed = response.creditsUsed,
                    CreditsRemaining = response.creditsRemaining
                };
            }
            catch (Exception ex)
            {
                return new GenerateResult { Success = false, Error = ex.Message };
            }
        }

        /// <summary>
        /// Get remaining credits
        /// </summary>
        public static async Task<int> GetCreditsAsync()
        {
            if (string.IsNullOrEmpty(_apiKey))
            {
                throw new InvalidOperationException("API key not set");
            }

            using var request = UnityWebRequest.Get($"{API_BASE_URL}/credits");
            request.SetRequestHeader("Authorization", $"Bearer {_apiKey}");

            var operation = request.SendWebRequest();
            while (!operation.isDone)
            {
                await Task.Yield();
            }

            if (request.result != UnityWebRequest.Result.Success)
            {
                throw new Exception(request.error);
            }

            var response = JsonUtility.FromJson<CreditsResponse>(request.downloadHandler.text);
            return response.credits;
        }
    }

    /// <summary>
    /// Options for sprite generation
    /// </summary>
    [Serializable]
    public class GenerateOptions
    {
        public string Prompt;
        public string Category;
        public string Subcategory;
        public string Style = "PIXEL_ART_32";
        public string ColorPalette;
        public int? Seed;
        public float PixelsPerUnit = 32f;
    }

    /// <summary>
    /// Result of sprite generation
    /// </summary>
    public class GenerateResult
    {
        public bool Success;
        public string Error;
        public Sprite Sprite;
        public Texture2D Texture;
        public string ImageUrl;
        public int Seed;
        public int CreditsUsed;
        public int CreditsRemaining;

        /// <summary>
        /// Save the generated texture to the Assets folder (Editor only)
        /// </summary>
        public void SaveToAssets(string path)
        {
#if UNITY_EDITOR
            if (Texture == null) return;

            var bytes = Texture.EncodeToPNG();
            System.IO.File.WriteAllBytes(path, bytes);
            UnityEditor.AssetDatabase.Refresh();

            // Configure import settings for pixel art
            var importer = UnityEditor.AssetImporter.GetAtPath(path) as UnityEditor.TextureImporter;
            if (importer != null)
            {
                importer.textureType = UnityEditor.TextureImporterType.Sprite;
                importer.spritePixelsPerUnit = 32;
                importer.filterMode = FilterMode.Point;
                importer.textureCompression = UnityEditor.TextureImporterCompression.Uncompressed;
                importer.SaveAndReimport();
            }
#else
            Debug.LogWarning("SaveToAssets is only available in the Unity Editor");
#endif
        }
    }

    // Internal request/response classes
    [Serializable]
    internal class GenerateRequest
    {
        public string prompt;
        public string categoryId;
        public string subcategoryId;
        public string styleId;
        public string colorPaletteId;
        public int? seed;
    }

    [Serializable]
    internal class GenerateResponse
    {
        public string imageUrl;
        public int seed;
        public int creditsUsed;
        public int creditsRemaining;
    }

    [Serializable]
    internal class CreditsResponse
    {
        public int credits;
    }
}
