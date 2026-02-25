// services/followService.ts - Updated with mutual follow features and notifications
import { supabase, getCachedUser } from '../utils/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { notifyFollowUpdate } from '../hooks/useFeed';

const notifyFollowChange = () => {
  // Trigger instant refresh of Following feed
  notifyFollowUpdate();
};

export interface FollowUser {
  id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_following?: boolean;
}

class FollowService {
  private followChannel: RealtimeChannel | null = null;
  private userChannel: RealtimeChannel | null = null;

  async followUser(followingId: string): Promise<boolean> {
    try {
      const { user } = await getCachedUser();
      if (!user) return false;

      // Prevent users from following themselves
      if (user.id === followingId) {
        console.warn('User attempted to follow themselves');
        return false;
      }

      // First check if already following to prevent duplicate key error
      const { data: existingFollow } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', followingId)
        .maybeSingle();

      if (existingFollow) {
        // Already following, return true (no-op)
        return true;
      }

      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: user.id,
          following_id: followingId
        });

      if (!error) {
        notifyFollowChange();
        // Note: Database trigger (notify_on_new_follower) automatically creates
        // the follow notification when user_follows row is inserted.
        // Removed duplicate client-side notification to fix double notification count.
      }
      return !error;
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    }
  }

  async unfollowUser(followingId: string): Promise<boolean> {
    try {
      const { user } = await getCachedUser();
      if (!user) return false;

      // Prevent users from unfollowing themselves (shouldn't happen, but for consistency)
      if (user.id === followingId) {
        console.warn('User attempted to unfollow themselves');
        return false;
      }

      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', followingId);

      if (!error) {
        notifyFollowChange();
      }
      return !error;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
  }

  async checkIfFollowing(userId: string): Promise<boolean> {
    try {
      const { user } = await getCachedUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single();

      return !!data && !error;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  // NEW: Check if two users follow each other (mutual follow)
  async checkMutualFollow(userId1: string, userId2: string): Promise<boolean> {
    try {
      // Check if user1 follows user2 AND user2 follows user1
      const { data: follow1, error: error1 } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', userId1)
        .eq('following_id', userId2)
        .single();

      if (error1 || !follow1) return false;

      const { data: follow2, error: error2 } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', userId2)
        .eq('following_id', userId1)
        .single();

      return !!follow2 && !error2;
    } catch (error) {
      console.error('Error checking mutual follow:', error);
      return false;
    }
  }

  // NEW: Get mutual followers between current user and target user
  async getMutualFollowers(targetUserId: string): Promise<FollowUser[]> {
    try {
      const { user } = await getCachedUser();
      if (!user) return [];

      // Get users who follow both current user and target user
      const { data, error } = await supabase
        .from('user_follows')
        .select(`
          follower:users!follower_id(
            id,
            username,
            name,
            avatar_url,
            bio
          )
        `)
        .eq('following_id', user.id);

      if (error || !data) return [];

      // Get followers of target user
      const { data: targetFollowers, error: targetError } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('following_id', targetUserId);

      if (targetError || !targetFollowers) return [];

      const targetFollowerIds = targetFollowers.map(f => f.follower_id);

      // Filter to get mutual followers
      const mutualFollowers = data
        .map(item => Array.isArray(item.follower) ? item.follower[0] : item.follower)
        .filter((follower): follower is NonNullable<typeof follower> => Boolean(follower))
        .filter(follower => targetFollowerIds.includes(follower.id)) as FollowUser[];

      return mutualFollowers;
    } catch (error) {
      console.error('Error getting mutual followers:', error);
      return [];
    }
  }
  
  async getFollowingIds(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (error) {
        console.error('Error getting following IDs:', error);
        return [];
      }

      return data?.map(item => item.following_id) || [];
    } catch (error) {
      console.error('Error getting following IDs:', error);
      return [];
    }
  }

  // NEW: Get follower IDs for a user
  async getFollowerIds(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('following_id', userId);

      if (error) {
        console.error('Error getting follower IDs:', error);
        return [];
      }

      return data?.map(item => item.follower_id) || [];
    } catch (error) {
      console.error('Error getting follower IDs:', error);
      return [];
    }
  }

  async getFollowers(userId: string, searchQuery?: string): Promise<FollowUser[]> {
    try {
      let query = supabase
        .from('user_follows')
        .select(`
          follower:users!follower_id(
            id,
            username,
            name,
            avatar_url,
            bio
          )
        `)
        .eq('following_id', userId);

      const { data, error } = await query;

      if (error || !data) {
        console.error('Error getting followers:', error);
        return [];
      }

      // Get current user to check following status
      const { user } = await getCachedUser();
      
      let followers = data
        .map(item => Array.isArray(item.follower) ? item.follower[0] : item.follower)
        .filter(Boolean) as FollowUser[];

      // Filter by search query if provided
      if (searchQuery) {
        followers = followers.filter(user => 
          user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Check following status for each user
      if (user) {
        const followingIds = await this.getFollowingIds(user.id);
        followers = followers.map(follower => ({
          ...follower,
          is_following: followingIds.includes(follower.id)
        }));
      }

      return followers;
    } catch (error) {
      console.error('Error getting followers:', error);
      return [];
    }
  }

  async getFollowing(userId: string, searchQuery?: string): Promise<FollowUser[]> {
    try {
      let query = supabase
        .from('user_follows')
        .select(`
          following:users!following_id(
            id,
            username,
            name,
            avatar_url,
            bio
          )
        `)
        .eq('follower_id', userId);

      const { data, error } = await query;

      if (error || !data) {
        console.error('Error getting following:', error);
        return [];
      }

      let following = data
        .map(item => Array.isArray(item.following) ? item.following[0] : item.following)
        .filter(Boolean) as FollowUser[];

      // Filter by search query if provided
      if (searchQuery) {
        following = following.filter(user => 
          user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // All users in following list are being followed
      following = following.map(user => ({
        ...user,
        is_following: true
      }));

      return following;
    } catch (error) {
      console.error('Error getting following:', error);
      return [];
    }
  }

  // NEW: Get friends (mutual follows) for a user
  async getFriends(userId: string, searchQuery?: string): Promise<FollowUser[]> {
    try {
      // Get users that the target user is following
      const following = await this.getFollowing(userId);
      const followingIds = following.map(u => u.id);

      // Get users who follow the target user
      const followers = await this.getFollowers(userId);
      
      // Find mutual connections (friends)
      const friends = followers.filter(follower => 
        followingIds.includes(follower.id)
      );

      // Filter by search query if provided
      if (searchQuery) {
        return friends.filter(user => 
          user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return friends;
    } catch (error) {
      console.error('Error getting friends:', error);
      return [];
    }
  }

  subscribeToFollowChanges(
    userId: string,
    onFollowChange: (change: any) => void
  ): () => void {
    // Subscribe to follow changes
    this.followChannel = supabase
      .channel(`follows:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_follows',
          filter: `follower_id=eq.${userId},following_id=eq.${userId}`
        },
        onFollowChange
      )
      .subscribe();

    // Subscribe to user count changes
    this.userChannel = supabase
      .channel(`user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`
        },
        onFollowChange
      )
      .subscribe();
      
    // Return unsubscribe function
    return () => {
      if (this.followChannel) {
        supabase.removeChannel(this.followChannel);
      }
      if (this.userChannel) {
        supabase.removeChannel(this.userChannel);
      }
    };
  }
}

export const followService = new FollowService();