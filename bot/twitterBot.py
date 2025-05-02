import tweepy
from dotenv import load_dotenv
import os
from datetime import datetime

# Log file path
LOG_PATH = "/home/ec2-user/defiPendulum/pendulum/twitterBot.log"

def log_msg(msg):
    # Make sure the log directory exists
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_PATH, 'a') as f:
        f.write(f"[{timestamp}] {msg}\n")

# Load environment variables from .env file
load_dotenv()

log_msg("Loaded environment variables.")

# Retrieve API credentials from environment variables
API_KEY = os.getenv('API_KEY')
API_SECRET_KEY = os.getenv('API_SECRET_KEY')
ACCESS_TOKEN = os.getenv('ACCESS_TOKEN')
ACCESS_TOKEN_SECRET = os.getenv('ACCESS_TOKEN_SECRET')

# Authenticate with Twitter API v1.1 and v2
def get_twitter_conn_v1(API_KEY, API_SECRET_KEY, ACCESS_TOKEN, ACCESS_TOKEN_SECRET) -> tweepy.API:
    auth = tweepy.OAuth1UserHandler(API_KEY, API_SECRET_KEY)
    auth.set_access_token(ACCESS_TOKEN, ACCESS_TOKEN_SECRET)
    return tweepy.API(auth)

def get_twitter_conn_v2(API_KEY, API_SECRET_KEY, ACCESS_TOKEN, ACCESS_TOKEN_SECRET) -> tweepy.Client:
    return tweepy.Client(
        consumer_key=API_KEY,
        consumer_secret=API_SECRET_KEY,
        access_token=ACCESS_TOKEN,
        access_token_secret=ACCESS_TOKEN_SECRET,
    )

try:
    client_v1 = get_twitter_conn_v1(API_KEY, API_SECRET_KEY, ACCESS_TOKEN, ACCESS_TOKEN_SECRET)
    client_v2 = get_twitter_conn_v2(API_KEY, API_SECRET_KEY, ACCESS_TOKEN, ACCESS_TOKEN_SECRET)
    log_msg("Twitter clients authenticated.")
except Exception as e:
    log_msg(f"Auth failed: {e}")
    raise

def upload_and_post_logs():
    try:
        log_msg("Reading pendulum log...")
        with open('/home/ec2-user/defiPendulum/pendulum/defiPendulum.log', 'r') as log_file:
            log_lines = log_file.readlines()

        last_lines = log_lines[-10:]
        tweet_text = ''.join(last_lines).strip()
        tweet_text = tweet_text[:280]

        client_v2.create_tweet(text=tweet_text)
        log_msg("Tweet posted successfully.")
    except Exception as e:
        log_msg(f"Failed to post tweet: {e}")

upload_and_post_logs()
