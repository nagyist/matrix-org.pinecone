package router

import (
	"fmt"

	"github.com/matrix-org/pinecone/types"
)

func (s *state) _forward(p *peer, f *types.Frame) error {
	nexthop := s._nextHopsFor(p, f)
	deadend := nexthop == nil || nexthop == p.router.local

	switch f.Type {
	// Protocol messages
	case types.TypeSTP:
		if err := s._handleTreeAnnouncement(p, f); err != nil {
			return fmt.Errorf("s._handleTreeAnnouncement (port %d): %s", p.port, err)
		}
		return nil

	case types.TypeKeepalive:
		return nil

	case types.TypeVirtualSnakeBootstrap:
		if deadend {
			if err := s._handleBootstrap(p, f); err != nil {
				return fmt.Errorf("s._handleBootstrap (port %d): %s", p.port, err)
			}
			return nil
		}

	case types.TypeVirtualSnakeBootstrapACK:
		if deadend {
			if err := s._handleBootstrapACK(p, f); err != nil {
				return fmt.Errorf("s._handleBootstrapACK (port %d): %s", p.port, err)
			}
			return nil
		}

	case types.TypeVirtualSnakeSetup:
		if err := s._handleSetup(p, f, nexthop); err != nil {
			return fmt.Errorf("s._handleSetup (port %d): %s", p.port, err)
		}
		return nil

	case types.TypeVirtualSnakeTeardown:
		var err error
		if nexthop, err = s._handleTeardown(p, f); err != nil {
			return fmt.Errorf("s._handleTeardown (port %d): %s", p.port, err)
		}
		if nexthop == nil {
			return nil
		}

	// Traffic messages
	case types.TypeVirtualSnake, types.TypeGreedy, types.TypeSource:

	case types.TypeSNEKPing:
		if f.DestinationKey == s.r.public {
			f = &types.Frame{
				Type:           types.TypeSNEKPong,
				DestinationKey: f.SourceKey,
				SourceKey:      s.r.public,
			}
			nexthop = s._nextHopsFor(s.r.local, f)
		}

	case types.TypeSNEKPong:
		if f.DestinationKey == s.r.public {
			v, ok := s.r.pings.Load(f.SourceKey)
			if !ok {
				return nil
			}
			ch := v.(chan struct{})
			close(ch)
			s.r.pings.Delete(f.SourceKey)
			return nil
		}

	case types.TypeTreePing:
		if deadend {
			f = &types.Frame{
				Type:        types.TypeTreePong,
				Destination: f.Source,
				Source:      s._coords(),
			}
			nexthop = s._nextHopsFor(s.r.local, f)
		}

	case types.TypeTreePong:
		if deadend {
			v, ok := s.r.pings.Load(f.Source.String())
			if !ok {
				return nil
			}
			ch := v.(chan struct{})
			close(ch)
			s.r.pings.Delete(f.Source.String())
			return nil
		}
	}

	if nexthop != nil {
		if !nexthop.send(f) {
			return fmt.Errorf("dropping forwarded packet of type %s", f.Type)
		}
		return nil
	}

	return fmt.Errorf("no next-hop found for packet of type %s", f.Type)
}
